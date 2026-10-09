import { randomBytes, randomUUID } from 'node:crypto'
import pg from 'pg'
import type { PoolClient } from 'pg'
import type { Recipe, RecipeRepository } from '../recipes/types.js'
import { DEFAULT_CATEGORIES, defaultCategoryRecipeIds } from './repository.js'
import { resolveMealSlot } from './schedule.js'
import {
  InvalidInviteError,
  MealAccessDeniedError,
  MealNotFoundError,
  MealValidationError,
  type MealAggregate,
  type MealCategory,
  type MealCategoryInput,
  type MealCreateInput,
  type MealMemberRole,
  type MealRepository,
  type MealStatus,
  type MealType,
} from './types.js'

const { Pool } = pg

const CATEGORY_SEED_MIGRATION = 'meal-categories-v1'
const LUNCH_MEAL_TYPE_MIGRATION = 'meal-types-lunch-v2'

interface MealRow {
  meal_id: string
  owner_id: string
  title: string
  meal_at: Date | string
  meal_type: MealType
  status: MealStatus
  invite_code: string
  invite_expires_at: Date | string
  created_at: Date | string
  updated_at: Date | string
}

interface MemberRow {
  user_id: string
  role: MealMemberRole
  joined_at: Date | string
  nickname: string | null
  avatar: string | null
}

interface DishRow {
  recipe_id: number
  quantity: number
  added_by: string
  updated_at: Date | string
}

interface WishRow {
  recipe_id: number
  user_id: string
  nickname: string | null
  avatar: string | null
}

interface CategoryRow {
  category_id: string
  name: string
  sort_order: number
  enabled: boolean
  recipe_ids: number[] | null
  updated_at: Date | string
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function uniqueRecipeIds(recipeIds: number[]): number[] {
  return [...new Set(recipeIds)]
}

function validateCategory(input: MealCategoryInput): MealCategoryInput {
  const id = input.id.trim()
  const name = input.name.trim()
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(id)) throw new MealValidationError('菜类编号格式无效')
  if (!name || name.length > 20) throw new MealValidationError('菜类名称格式无效')
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < -10000 || input.sortOrder > 10000) {
    throw new MealValidationError('菜类排序值无效')
  }
  if (typeof input.enabled !== 'boolean') throw new MealValidationError('菜类启用状态无效')
  if (input.recipeIds.length > 200 || input.recipeIds.some(id => !Number.isInteger(id) || id < 1)) {
    throw new MealValidationError('菜谱编号列表格式无效')
  }
  return { id, name, sortOrder: input.sortOrder, enabled: input.enabled, recipeIds: uniqueRecipeIds(input.recipeIds) }
}

function validateMealInput(input: MealCreateInput): MealCreateInput {
  const title = input.title.trim()
  const mealAt = new Date(input.mealAt)
  if (!title || title.length > 40) throw new MealValidationError('饭局名称格式无效')
  if (Number.isNaN(mealAt.getTime())) throw new MealValidationError('用餐时间格式无效')
  if (input.mealType !== 'lunch' && input.mealType !== 'dinner') {
    throw new MealValidationError('餐次类型仅支持午餐或晚餐')
  }
  return { title, mealAt: mealAt.toISOString(), mealType: input.mealType }
}

function isForeignKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23503')
}

export async function createPostgresMealRepository(
  databaseUrl: string,
  recipes: RecipeRepository,
): Promise<MealRepository> {
  const pool = new Pool({ connectionString: databaseUrl })

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fandazi_meal_schema_migration (
        migration_id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fandazi_meal (
        meal_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 40),
        meal_at TIMESTAMPTZ NOT NULL,
        meal_type TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'closed')),
        invite_code TEXT NOT NULL UNIQUE,
        invite_expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE fandazi_meal
        ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
      UPDATE fandazi_meal
      SET invite_expires_at = meal_at + INTERVAL '12 hours'
      WHERE invite_expires_at IS NULL;
      ALTER TABLE fandazi_meal
        ALTER COLUMN invite_expires_at SET NOT NULL;
      CREATE INDEX IF NOT EXISTS fandazi_meal_current_idx
        ON fandazi_meal (status, created_at DESC);

      CREATE TABLE IF NOT EXISTS fandazi_meal_member (
        meal_id TEXT NOT NULL REFERENCES fandazi_meal(meal_id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (meal_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS fandazi_meal_member_user_idx
        ON fandazi_meal_member (user_id, joined_at DESC);

      CREATE TABLE IF NOT EXISTS fandazi_user_current_meal (
        user_id TEXT PRIMARY KEY,
        meal_id TEXT NOT NULL REFERENCES fandazi_meal(meal_id) ON DELETE CASCADE,
        selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS fandazi_user_current_meal_meal_idx
        ON fandazi_user_current_meal (meal_id);

      INSERT INTO fandazi_user_current_meal (user_id, meal_id, selected_at)
      SELECT DISTINCT ON (mm.user_id)
             mm.user_id, mm.meal_id, GREATEST(mm.joined_at, m.updated_at)
      FROM fandazi_meal_member mm
      JOIN fandazi_meal m ON m.meal_id = mm.meal_id
      WHERE m.status IN ('active', 'confirmed')
      ORDER BY mm.user_id, m.updated_at DESC, m.created_at DESC
      ON CONFLICT (user_id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS fandazi_meal_dish (
        meal_id TEXT NOT NULL REFERENCES fandazi_meal(meal_id) ON DELETE CASCADE,
        recipe_id INTEGER NOT NULL REFERENCES fandazi_recipe(recipe_id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
        added_by TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (meal_id, recipe_id),
        FOREIGN KEY (meal_id, added_by)
          REFERENCES fandazi_meal_member(meal_id, user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS fandazi_meal_wish (
        meal_id TEXT NOT NULL,
        recipe_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (meal_id, recipe_id, user_id),
        FOREIGN KEY (meal_id, recipe_id)
          REFERENCES fandazi_meal_dish(meal_id, recipe_id) ON DELETE CASCADE,
        FOREIGN KEY (meal_id, user_id)
          REFERENCES fandazi_meal_member(meal_id, user_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS fandazi_meal_category (
        category_id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
        sort_order INTEGER NOT NULL DEFAULT 0,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fandazi_meal_category_recipe (
        category_id TEXT NOT NULL REFERENCES fandazi_meal_category(category_id) ON DELETE CASCADE,
        recipe_id INTEGER NOT NULL REFERENCES fandazi_recipe(recipe_id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (category_id, recipe_id)
      );
      CREATE INDEX IF NOT EXISTS fandazi_meal_category_recipe_sort_idx
        ON fandazi_meal_category_recipe (category_id, sort_order, recipe_id);
    `)

    const migrationClient = await pool.connect()
    try {
      await migrationClient.query('BEGIN')
      await migrationClient.query("SELECT pg_advisory_xact_lock(hashtext('fandazi-meal-schema'))")
      const lunchMealTypeMigration = await migrationClient.query<{ migration_id: string }>(
        'SELECT migration_id FROM fandazi_meal_schema_migration WHERE migration_id = $1',
        [LUNCH_MEAL_TYPE_MIGRATION],
      )
      if (!lunchMealTypeMigration.rowCount) {
        await migrationClient.query(`
          ALTER TABLE fandazi_meal
            DROP CONSTRAINT IF EXISTS fandazi_meal_meal_type_check;
          ALTER TABLE fandazi_meal
            ADD CONSTRAINT fandazi_meal_meal_type_check
            CHECK (meal_type IN ('lunch', 'dinner'));
        `)
        await migrationClient.query(
          'INSERT INTO fandazi_meal_schema_migration (migration_id) VALUES ($1)',
          [LUNCH_MEAL_TYPE_MIGRATION],
        )
      }
      const migration = await migrationClient.query<{ migration_id: string }>(
        'SELECT migration_id FROM fandazi_meal_schema_migration WHERE migration_id = $1',
        [CATEGORY_SEED_MIGRATION],
      )
      if (!migration.rowCount) {
        const catalog = await recipes.list({ limit: 1000, sort: 'default' })
        for (const category of DEFAULT_CATEGORIES) {
          const inserted = await migrationClient.query<{ category_id: string }>(
            `INSERT INTO fandazi_meal_category (category_id, name, sort_order, enabled)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (category_id) DO NOTHING
             RETURNING category_id`,
            [category.id, category.name, category.sortOrder, category.enabled],
          )
          if (!inserted.rowCount) continue
          const recipeIds = defaultCategoryRecipeIds(category.id, catalog)
          for (const [sortOrder, recipeId] of recipeIds.entries()) {
            await migrationClient.query(
              `INSERT INTO fandazi_meal_category_recipe (category_id, recipe_id, sort_order)
               VALUES ($1, $2, $3)
               ON CONFLICT (category_id, recipe_id) DO NOTHING`,
              [category.id, recipeId, sortOrder],
            )
          }
        }
        await migrationClient.query(
          'INSERT INTO fandazi_meal_schema_migration (migration_id) VALUES ($1)',
          [CATEGORY_SEED_MIGRATION],
        )
      }
      await migrationClient.query('COMMIT')
    } catch (error) {
      await migrationClient.query('ROLLBACK')
      throw error
    } finally {
      migrationClient.release()
    }
  } catch (error) {
    await pool.end()
    throw error
  }

  async function findMeal(
    mealId: string,
    client: PoolClient | typeof pool = pool,
    forUpdate = false,
  ): Promise<MealRow> {
    const result = await client.query<MealRow>(
      `SELECT meal_id, owner_id, title, meal_at, meal_type, status,
              invite_code, invite_expires_at, created_at, updated_at
       FROM fandazi_meal
       WHERE meal_id = $1
       ${forUpdate ? 'FOR UPDATE' : ''}`,
      [mealId],
    )
    const meal = result.rows[0]
    if (!meal) throw new MealNotFoundError()
    return meal
  }

  async function ensureMember(client: PoolClient, mealId: string, userId: string): Promise<void> {
    const result = await client.query<{ is_member: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM fandazi_meal_member mm
         WHERE mm.meal_id = m.meal_id AND mm.user_id = $2
       ) is_member
       FROM fandazi_meal m
       WHERE m.meal_id = $1`,
      [mealId, userId],
    )
    const row = result.rows[0]
    if (!row) throw new MealNotFoundError()
    if (!row.is_member) throw new MealAccessDeniedError('加入饭局后才能操作')
  }

  function ensureActive(meal: MealRow): void {
    if (meal.status !== 'active') throw new MealValidationError('饭局已确认，不能再修改')
  }

  function inviteIsExpired(meal: MealRow): boolean {
    return new Date(meal.invite_expires_at).getTime() <= Date.now()
  }

  async function selectCurrentMeal(client: PoolClient, userId: string, mealId: string): Promise<void> {
    await client.query(
      `INSERT INTO fandazi_user_current_meal (user_id, meal_id, selected_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET meal_id = EXCLUDED.meal_id, selected_at = NOW()`,
      [userId, mealId],
    )
  }

  async function ensureRecipe(recipeId: number): Promise<Recipe> {
    if (!Number.isInteger(recipeId) || recipeId < 1) throw new MealValidationError('菜谱编号无效')
    const recipe = await recipes.findById(recipeId)
    if (!recipe) throw new MealValidationError('菜谱不存在')
    return recipe
  }

  async function aggregateWithClient(
    client: PoolClient,
    mealId: string,
    currentUserId?: string,
    inviteCode?: string,
  ): Promise<MealAggregate> {
    const meal = await findMeal(mealId, client)
    const membership = currentUserId
      ? await client.query<{ is_member: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM fandazi_meal_member WHERE meal_id = $1 AND user_id = $2
           ) is_member`,
          [mealId, currentUserId],
        )
      : undefined
    const isMember = membership?.rows[0]?.is_member ?? false
    if (!isMember) {
      if (inviteCode !== meal.invite_code) throw new MealAccessDeniedError()
      if (inviteIsExpired(meal)) throw new InvalidInviteError('邀请已过期')
    }

    const memberRows = await client.query<MemberRow>(
      `SELECT mm.user_id, mm.role, mm.joined_at,
              us.payload->'profile'->>'nickname' nickname,
              us.payload->'profile'->>'avatar' avatar
       FROM fandazi_meal_member mm
       LEFT JOIN fandazi_user_state us ON us.client_id = mm.user_id
       WHERE mm.meal_id = $1
       ORDER BY mm.joined_at, mm.user_id`,
      [mealId],
    )
    const dishRows = await client.query<DishRow>(
      `SELECT recipe_id, quantity, added_by, updated_at
       FROM fandazi_meal_dish
       WHERE meal_id = $1
       ORDER BY updated_at, recipe_id`,
      [mealId],
    )
    const wishRows = await client.query<WishRow>(
      `SELECT mw.recipe_id, mw.user_id,
              us.payload->'profile'->>'nickname' nickname,
              us.payload->'profile'->>'avatar' avatar
       FROM fandazi_meal_wish mw
       LEFT JOIN fandazi_user_state us ON us.client_id = mw.user_id
       WHERE mw.meal_id = $1
       ORDER BY mw.created_at, mw.user_id`,
      [mealId],
    )

    const wishersByRecipe = new Map<number, MealAggregate['dishes'][number]['wishers']>()
    for (const row of wishRows.rows) {
      const wishers = wishersByRecipe.get(row.recipe_id) ?? []
      wishers.push({
        userId: row.user_id,
        nickname: row.nickname ?? '微信用户',
        avatar: row.avatar ?? '',
      })
      wishersByRecipe.set(row.recipe_id, wishers)
    }

    const dishes = (await Promise.all(dishRows.rows.map(async (row) => {
      const recipe = await recipes.findById(row.recipe_id)
      if (!recipe) return undefined
      const wishers = wishersByRecipe.get(row.recipe_id) ?? []
      return {
        recipe,
        quantity: row.quantity,
        addedBy: row.added_by,
        wishCount: wishers.length,
        wishers,
        updatedAt: toIso(row.updated_at),
      }
    }))).filter((dish): dish is NonNullable<typeof dish> => Boolean(dish))

    return {
      id: meal.meal_id,
      ownerId: meal.owner_id,
      title: meal.title,
      mealAt: toIso(meal.meal_at),
      mealType: meal.meal_type,
      status: meal.status,
      inviteCode: isMember ? meal.invite_code : '',
      inviteExpiresAt: toIso(meal.invite_expires_at),
      members: memberRows.rows.map(row => ({
        userId: row.user_id,
        nickname: row.nickname ?? '微信用户',
        avatar: row.avatar ?? '',
        role: row.role,
        joinedAt: toIso(row.joined_at),
      })),
      dishes,
      currentUserId: currentUserId ?? null,
      isMember,
      createdAt: toIso(meal.created_at),
      updatedAt: toIso(meal.updated_at),
    }
  }

  async function aggregate(mealId: string, currentUserId?: string, inviteCode?: string): Promise<MealAggregate> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
      const result = await aggregateWithClient(client, mealId, currentUserId, inviteCode)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async function withMemberMutation(
    mealId: string,
    userId: string,
    mutate: (client: PoolClient) => Promise<void>,
  ): Promise<MealAggregate> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const meal = await findMeal(mealId, client, true)
      await ensureMember(client, mealId, userId)
      ensureActive(meal)
      await mutate(client)
      await client.query('UPDATE fandazi_meal SET updated_at = NOW() WHERE meal_id = $1', [mealId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      if (isForeignKeyError(error)) throw new MealValidationError('菜谱不存在')
      throw error
    } finally {
      client.release()
    }
    return aggregate(mealId, userId)
  }

  return {
    async getCurrent(userId) {
      const targetSlot = resolveMealSlot()
      const result = await pool.query<{ meal_id: string }>(
        `SELECT m.meal_id
         FROM fandazi_meal_member mm
         JOIN fandazi_meal m ON m.meal_id = mm.meal_id
         LEFT JOIN fandazi_user_current_meal cm
           ON cm.user_id = mm.user_id AND cm.meal_id = m.meal_id
         WHERE mm.user_id = $1
           AND m.status IN ('active', 'confirmed')
           AND m.meal_type = $3
           AND (m.meal_at AT TIME ZONE 'Asia/Shanghai')::DATE
             = ($2::TIMESTAMPTZ AT TIME ZONE 'Asia/Shanghai')::DATE
         ORDER BY (cm.meal_id IS NOT NULL) DESC,
                  (mm.role = 'member') DESC,
                  GREATEST(mm.joined_at, m.updated_at) DESC,
                  m.created_at DESC,
                  m.meal_id DESC
         LIMIT 1`,
        [userId, targetSlot.mealAt.toISOString(), targetSlot.mealType],
      )
      const mealId = result.rows[0]?.meal_id
      return mealId ? aggregate(mealId, userId) : undefined
    },

    async createMeal(userId, input) {
      if (!userId.trim()) throw new MealValidationError('用户编号无效')
      const validated = validateMealInput(input)
      await recipes.getUserState(userId)
      const mealId = randomUUID()
      const inviteCode = randomBytes(9).toString('base64url')
      const client = await pool.connect()
      let selectedMealId: string = mealId
      try {
        await client.query('BEGIN')
        await client.query(
          `SELECT pg_advisory_xact_lock(
             hashtext('fandazi-meal-create'),
             hashtext($1)
           )`,
          [userId],
        )
        const existing = await client.query<{ meal_id: string }>(
          `SELECT m.meal_id
           FROM fandazi_meal m
           WHERE m.owner_id = $1
             AND m.status = 'active'
             AND m.meal_type = $3
             AND (m.meal_at AT TIME ZONE 'Asia/Shanghai')::DATE
               = ($2::TIMESTAMPTZ AT TIME ZONE 'Asia/Shanghai')::DATE
           ORDER BY m.updated_at DESC, m.created_at DESC
           LIMIT 1`,
          [userId, validated.mealAt, validated.mealType],
        )
        const existingMealId = existing.rows[0]?.meal_id
        if (existingMealId) {
          selectedMealId = existingMealId
        } else {
          await client.query(
            `INSERT INTO fandazi_meal
               (meal_id, owner_id, title, meal_at, meal_type, status,
                invite_code, invite_expires_at)
             VALUES ($1, $2, $3, $4, $5, 'active', $6,
                     $4::TIMESTAMPTZ + INTERVAL '12 hours')`,
            [mealId, userId, validated.title, validated.mealAt, validated.mealType, inviteCode],
          )
          await client.query(
            `INSERT INTO fandazi_meal_member (meal_id, user_id, role)
             VALUES ($1, $2, 'owner')`,
            [mealId, userId],
          )
        }
        await selectCurrentMeal(client, userId, selectedMealId)
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
      return aggregate(selectedMealId, userId)
    },

    async getMeal(mealId, currentUserId, inviteCode) {
      return aggregate(mealId, currentUserId, inviteCode)
    },

    async joinMeal(mealId, userId, inviteCode) {
      if (!userId.trim()) throw new MealValidationError('用户编号无效')
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const meal = await findMeal(mealId, client, true)
        ensureActive(meal)
        const membership = await client.query<{ is_member: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM fandazi_meal_member
             WHERE meal_id = $1 AND user_id = $2
           ) is_member`,
          [mealId, userId],
        )
        if (!membership.rows[0]?.is_member) {
          if (inviteCode !== meal.invite_code) throw new InvalidInviteError()
          if (inviteIsExpired(meal)) throw new InvalidInviteError('邀请已过期')
          await recipes.getUserState(userId)
          await client.query(
            `INSERT INTO fandazi_meal_member (meal_id, user_id, role)
             VALUES ($1, $2, 'member')
             ON CONFLICT (meal_id, user_id) DO NOTHING`,
            [mealId, userId],
          )
        }
        await selectCurrentMeal(client, userId, mealId)
        await client.query('UPDATE fandazi_meal SET updated_at = NOW() WHERE meal_id = $1', [mealId])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
      return aggregate(mealId, userId)
    },

    async setWish(mealId, userId, recipeId) {
      return withMemberMutation(mealId, userId, async (client) => {
        await ensureRecipe(recipeId)
        await client.query(
          `INSERT INTO fandazi_meal_dish (meal_id, recipe_id, quantity, added_by)
           VALUES ($1, $2, 1, $3)
           ON CONFLICT (meal_id, recipe_id) DO NOTHING`,
          [mealId, recipeId, userId],
        )
        await client.query(
          `INSERT INTO fandazi_meal_wish (meal_id, recipe_id, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (meal_id, recipe_id, user_id) DO NOTHING`,
          [mealId, recipeId, userId],
        )
      })
    },

    async removeWish(mealId, userId, recipeId) {
      return withMemberMutation(mealId, userId, async (client) => {
        await client.query(
          `WITH deleted_wish AS (
             DELETE FROM fandazi_meal_wish
             WHERE meal_id = $1 AND recipe_id = $2 AND user_id = $3
             RETURNING meal_id, recipe_id
           )
           DELETE FROM fandazi_meal_dish d
           USING deleted_wish dw
           WHERE d.meal_id = dw.meal_id
             AND d.recipe_id = dw.recipe_id
             AND d.quantity = 1
             AND NOT EXISTS (
               SELECT 1
               FROM fandazi_meal_wish w
               WHERE w.meal_id = d.meal_id
                 AND w.recipe_id = d.recipe_id
                 AND w.user_id <> $3
             )`,
          [mealId, recipeId, userId],
        )
      })
    },

    async setDish(mealId, userId, recipeId, quantity) {
      return withMemberMutation(mealId, userId, async (client) => {
        await ensureRecipe(recipeId)
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
          throw new MealValidationError('菜品数量需在 1 到 20 之间')
        }
        await client.query(
          `INSERT INTO fandazi_meal_dish (meal_id, recipe_id, quantity, added_by, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (meal_id, recipe_id) DO UPDATE
           SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
          [mealId, recipeId, quantity, userId],
        )
      })
    },

    async removeDish(mealId, userId, recipeId) {
      return withMemberMutation(mealId, userId, async (client) => {
        await client.query(
          'DELETE FROM fandazi_meal_dish WHERE meal_id = $1 AND recipe_id = $2',
          [mealId, recipeId],
        )
      })
    },

    async addDishQuantity(mealId, userId, recipeId, delta) {
      if (delta !== 1 && delta !== -1) throw new MealValidationError('菜品数量变化值无效')
      return withMemberMutation(mealId, userId, async (client) => {
        await ensureRecipe(recipeId)
        if (delta === 1) {
          const result = await client.query<{ quantity: number }>(
            `INSERT INTO fandazi_meal_dish
               (meal_id, recipe_id, quantity, added_by, updated_at)
             VALUES ($1, $2, 1, $3, NOW())
             ON CONFLICT (meal_id, recipe_id) DO UPDATE
             SET quantity = fandazi_meal_dish.quantity + 1,
                 updated_at = NOW()
             WHERE fandazi_meal_dish.quantity < 20
             RETURNING quantity`,
            [mealId, recipeId, userId],
          )
          if (!result.rowCount) throw new MealValidationError('菜品数量需在 1 到 20 之间')
          return
        }

        const result = await client.query<{ quantity: number }>(
          `WITH current_dish AS (
             SELECT meal_id, recipe_id, quantity
             FROM fandazi_meal_dish
             WHERE meal_id = $1 AND recipe_id = $2
             FOR UPDATE
           ), updated AS (
             UPDATE fandazi_meal_dish d
             SET quantity = d.quantity - 1, updated_at = NOW()
             FROM current_dish c
             WHERE d.meal_id = c.meal_id
               AND d.recipe_id = c.recipe_id
               AND c.quantity > 1
             RETURNING d.quantity
           ), deleted AS (
             DELETE FROM fandazi_meal_dish d
             USING current_dish c
             WHERE d.meal_id = c.meal_id
               AND d.recipe_id = c.recipe_id
               AND c.quantity = 1
             RETURNING 0 AS quantity
           )
           SELECT quantity FROM updated
           UNION ALL
           SELECT quantity FROM deleted`,
          [mealId, recipeId],
        )
        if (!result.rowCount) throw new MealValidationError('菜品尚未加入菜单')
      })
    },

    async confirmMeal(mealId, userId) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const meal = await findMeal(mealId, client, true)
        await ensureMember(client, mealId, userId)
        if (meal.status === 'closed') throw new MealValidationError('饭局已关闭')
        if (meal.status === 'active') {
          await client.query(
            `UPDATE fandazi_meal
             SET status = 'confirmed', updated_at = NOW()
             WHERE meal_id = $1`,
            [mealId],
          )
        }
        await selectCurrentMeal(client, userId, mealId)
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
      return aggregate(mealId, userId)
    },

    async listCategories(includeDisabled = false) {
      const result = await pool.query<CategoryRow>(
        `SELECT c.category_id, c.name, c.sort_order, c.enabled, c.updated_at,
                COALESCE(
                  array_agg(cr.recipe_id ORDER BY cr.sort_order, cr.recipe_id)
                    FILTER (WHERE cr.recipe_id IS NOT NULL),
                  ARRAY[]::INTEGER[]
                ) recipe_ids
         FROM fandazi_meal_category c
         LEFT JOIN fandazi_meal_category_recipe cr ON cr.category_id = c.category_id
         WHERE $1::BOOLEAN OR c.enabled
         GROUP BY c.category_id, c.name, c.sort_order, c.enabled, c.updated_at
         ORDER BY c.sort_order, c.category_id`,
        [includeDisabled],
      )
      return result.rows.map(row => ({
        id: row.category_id,
        name: row.name,
        sortOrder: row.sort_order,
        enabled: row.enabled,
        recipeIds: row.recipe_ids ?? [],
        updatedAt: toIso(row.updated_at),
      }))
    },

    async upsertCategory(input) {
      const category = validateCategory(input)
      for (const recipeId of category.recipeIds) await ensureRecipe(recipeId)
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await client.query<CategoryRow>(
          `INSERT INTO fandazi_meal_category
             (category_id, name, sort_order, enabled, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (category_id) DO UPDATE
           SET name = EXCLUDED.name,
               sort_order = EXCLUDED.sort_order,
               enabled = EXCLUDED.enabled,
               updated_at = NOW()
           RETURNING category_id, name, sort_order, enabled, updated_at,
                     ARRAY[]::INTEGER[] recipe_ids`,
          [category.id, category.name, category.sortOrder, category.enabled],
        )
        await client.query('DELETE FROM fandazi_meal_category_recipe WHERE category_id = $1', [category.id])
        for (const [sortOrder, recipeId] of category.recipeIds.entries()) {
          await client.query(
            `INSERT INTO fandazi_meal_category_recipe (category_id, recipe_id, sort_order)
             VALUES ($1, $2, $3)`,
            [category.id, recipeId, sortOrder],
          )
        }
        await client.query('COMMIT')
        const row = result.rows[0]
        if (!row) throw new MealValidationError('菜类保存失败')
        return {
          id: row.category_id,
          name: row.name,
          sortOrder: row.sort_order,
          enabled: row.enabled,
          recipeIds: category.recipeIds,
          updatedAt: toIso(row.updated_at),
        }
      } catch (error) {
        await client.query('ROLLBACK')
        if (isForeignKeyError(error)) throw new MealValidationError('菜谱不存在')
        throw error
      } finally {
        client.release()
      }
    },

    async deleteCategory(id) {
      const result = await pool.query('DELETE FROM fandazi_meal_category WHERE category_id = $1', [id])
      return Boolean(result.rowCount)
    },

    async close() {
      await pool.end()
    },
  }
}
