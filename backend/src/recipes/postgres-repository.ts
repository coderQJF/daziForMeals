import pg from 'pg'
import { categorySeeds, getSeedTaggings, recipeSeeds, recipeTagSeeds, statusSeeds, type SeedRecipe } from './seed.js'
import { takeoutShops } from '../experience/seed.js'
import { createDefaultUserState, mapCategory, mapPlanPayload, mapSeedRecipe, sanitizeUserRecipeIds, selectRecommendation } from './repository.js'
import type { BootstrapPayload, Category, Recipe, RecipeQuery, RecipeRepository, StatusOption, TakeoutShop, UserState, UserStateUpdate } from './types.js'

const { Pool } = pg

type UserRecipeAction = 'favorite' | 'liked' | 'cooked' | 'planned'

const actionFields: Record<UserRecipeAction, keyof Pick<UserState, 'favoriteRecipeIds' | 'likedRecipeIds' | 'cookedRecipeIds' | 'plannedRecipeIds'>> = {
  favorite: 'favoriteRecipeIds',
  liked: 'likedRecipeIds',
  cooked: 'cookedRecipeIds',
  planned: 'plannedRecipeIds',
}

export async function createPostgresRecipeRepository(databaseUrl: string, assetBaseUrl: string): Promise<RecipeRepository> {
  const pool = new Pool({ connectionString: databaseUrl })

  // Keep the legacy content table only as a non-destructive migration source.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fandazi_content (
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (content_type, content_id)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fandazi_recipe (
      recipe_id INTEGER PRIMARY KEY,
      payload JSONB NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS fandazi_recipe_sort_idx ON fandazi_recipe (sort_order, recipe_id);

    CREATE TABLE IF NOT EXISTS fandazi_tag (
      tag_id TEXT PRIMARY KEY,
      tag_type TEXT NOT NULL CHECK (tag_type IN ('status', 'feature')),
      name TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fandazi_recipe_tag (
      recipe_id INTEGER NOT NULL REFERENCES fandazi_recipe(recipe_id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES fandazi_tag(tag_id) ON DELETE CASCADE,
      weight SMALLINT NOT NULL DEFAULT 100 CHECK (weight BETWEEN 1 AND 200),
      source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),
      confidence NUMERIC(4,3) NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
      PRIMARY KEY (recipe_id, tag_id)
    );
    CREATE INDEX IF NOT EXISTS fandazi_recipe_tag_lookup_idx ON fandazi_recipe_tag (tag_id, weight DESC, recipe_id);

    CREATE TABLE IF NOT EXISTS fandazi_taxonomy (
      taxonomy_type TEXT NOT NULL CHECK (taxonomy_type IN ('category', 'status')),
      taxonomy_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (taxonomy_type, taxonomy_id)
    );

    CREATE TABLE IF NOT EXISTS fandazi_takeout_shop (
      shop_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS fandazi_takeout_category_idx ON fandazi_takeout_shop ((payload->>'categoryId'));

    CREATE TABLE IF NOT EXISTS fandazi_user_state (
      client_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      actions_migrated BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE fandazi_user_state ADD COLUMN IF NOT EXISTS actions_migrated BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS fandazi_user_recipe_action (
      client_id TEXT NOT NULL,
      recipe_id INTEGER NOT NULL REFERENCES fandazi_recipe(recipe_id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK (action IN ('favorite', 'liked', 'cooked', 'planned')),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, recipe_id, action)
    );
    CREATE INDEX IF NOT EXISTS fandazi_user_recipe_action_lookup_idx ON fandazi_user_recipe_action (client_id, action, updated_at DESC);

    CREATE TABLE IF NOT EXISTS fandazi_recommendation_history (
      client_id TEXT NOT NULL,
      recipe_id INTEGER NOT NULL REFERENCES fandazi_recipe(recipe_id) ON DELETE CASCADE,
      seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, recipe_id)
    );
    CREATE INDEX IF NOT EXISTS fandazi_recommendation_recent_idx ON fandazi_recommendation_history (client_id, seen_at DESC);
  `)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      INSERT INTO fandazi_recipe (recipe_id, payload, sort_order, updated_at)
      SELECT content_id::INTEGER, payload, sort_order, updated_at
      FROM fandazi_content
      WHERE content_type = 'recipe' AND content_id ~ '^[0-9]+$'
      ON CONFLICT (recipe_id) DO NOTHING
    `)

    for (const [index, category] of categorySeeds.entries()) {
      await client.query(
        `INSERT INTO fandazi_taxonomy (taxonomy_type, taxonomy_id, payload, sort_order)
         VALUES ('category', $1, $2::jsonb, $3)
         ON CONFLICT (taxonomy_type, taxonomy_id) DO NOTHING`,
        [category.id, JSON.stringify(category), index],
      )
    }
    for (const [index, status] of statusSeeds.entries()) {
      await client.query(
        `INSERT INTO fandazi_taxonomy (taxonomy_type, taxonomy_id, payload, sort_order)
         VALUES ('status', $1, $2::jsonb, $3)
         ON CONFLICT (taxonomy_type, taxonomy_id) DO NOTHING`,
        [status.id, JSON.stringify(status), index],
      )
    }
    for (const recipe of recipeSeeds) {
      await client.query(
        `INSERT INTO fandazi_recipe (recipe_id, payload, sort_order)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (recipe_id) DO UPDATE
         SET payload = EXCLUDED.payload, sort_order = EXCLUDED.sort_order, updated_at = NOW()`,
        [recipe.id, JSON.stringify(recipe), recipe.sortOrder],
      )
    }
    for (const tag of recipeTagSeeds) {
      await client.query(
        `INSERT INTO fandazi_tag (tag_id, tag_type, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (tag_id) DO NOTHING`,
        [tag.id, tag.type, tag.name],
      )
    }
    for (const recipe of recipeSeeds) {
      await client.query('DELETE FROM fandazi_recipe_tag WHERE recipe_id = $1', [recipe.id])
      for (const tagging of getSeedTaggings(recipe)) {
        await client.query(
          `INSERT INTO fandazi_recipe_tag (recipe_id, tag_id, weight, source, confidence)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (recipe_id, tag_id) DO UPDATE
           SET weight = EXCLUDED.weight, source = EXCLUDED.source, confidence = EXCLUDED.confidence`,
          [recipe.id, tagging.tagId, tagging.weight, tagging.source, tagging.confidence],
        )
      }
    }
    for (const shop of takeoutShops) {
      await client.query(
        `INSERT INTO fandazi_takeout_shop (shop_id, payload)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (shop_id) DO NOTHING`,
        [shop.id, JSON.stringify(shop)],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  const recipeRows = await pool.query<{ payload: SeedRecipe }>(
    'SELECT payload FROM fandazi_recipe ORDER BY sort_order, recipe_id',
  )
  const tagRows = await pool.query<{
    recipe_id: number
    tag_id: string
    tag_type: 'status' | 'feature'
    name: string
    weight: number
    source: 'manual' | 'ai'
    confidence: string | number
  }>(`
    SELECT rt.recipe_id, rt.tag_id, t.tag_type, t.name, rt.weight, rt.source, rt.confidence
    FROM fandazi_recipe_tag rt
    JOIN fandazi_tag t ON t.tag_id = rt.tag_id
    ORDER BY rt.recipe_id, t.tag_type, rt.tag_id
  `)
  const tagRowsByRecipe = new Map<number, typeof tagRows.rows>()
  for (const row of tagRows.rows) {
    const rows = tagRowsByRecipe.get(row.recipe_id) ?? []
    rows.push(row)
    tagRowsByRecipe.set(row.recipe_id, rows)
  }
  const recipes = recipeRows.rows.map(({ payload }) => {
    const recipe = mapSeedRecipe(payload, assetBaseUrl)
    const relations = tagRowsByRecipe.get(recipe.id)
    if (!relations?.length) return recipe
    return {
      ...recipe,
      tags: relations.filter(tag => tag.tag_type === 'feature').map(tag => tag.name),
      statusIds: relations.filter(tag => tag.tag_type === 'status').map(tag => tag.tag_id),
      tagIds: relations.map(tag => tag.tag_id),
      taggings: relations.map(tag => ({
        tagId: tag.tag_id,
        weight: tag.weight,
        source: tag.source,
        confidence: Number(tag.confidence),
      })),
    }
  })
  const recipeIds = new Set(recipes.map(recipe => recipe.id))
  const taxonomy = await pool.query<{ taxonomy_type: string; payload: unknown }>(
    'SELECT taxonomy_type, payload FROM fandazi_taxonomy ORDER BY sort_order, taxonomy_id',
  )
  const categories = taxonomy.rows
    .filter(row => row.taxonomy_type === 'category')
    .map(row => mapCategory(row.payload as Category, assetBaseUrl))
  const statuses = taxonomy.rows
    .filter(row => row.taxonomy_type === 'status')
    .map(row => row.payload as StatusOption)

  async function replaceUserActions(clientId: string, state: UserState) {
    const actionClient = await pool.connect()
    try {
      await actionClient.query('BEGIN')
      await actionClient.query('DELETE FROM fandazi_user_recipe_action WHERE client_id = $1', [clientId])
      for (const [action, field] of Object.entries(actionFields) as Array<[UserRecipeAction, typeof actionFields[UserRecipeAction]]>) {
        for (const recipeId of state[field]) {
          await actionClient.query(
            `INSERT INTO fandazi_user_recipe_action (client_id, recipe_id, action)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [clientId, recipeId, action],
          )
        }
      }
      await actionClient.query(
        'UPDATE fandazi_user_state SET actions_migrated = TRUE WHERE client_id = $1',
        [clientId],
      )
      await actionClient.query('COMMIT')
    } catch (error) {
      await actionClient.query('ROLLBACK')
      throw error
    } finally {
      actionClient.release()
    }
  }

  async function hydrateUserActions(state: UserState): Promise<UserState> {
    const rows = await pool.query<{ recipe_id: number; action: UserRecipeAction }>(
      'SELECT recipe_id, action FROM fandazi_user_recipe_action WHERE client_id = $1 ORDER BY updated_at, recipe_id',
      [state.clientId],
    )
    const hydrated: UserState = {
      ...state,
      favoriteRecipeIds: [],
      likedRecipeIds: [],
      cookedRecipeIds: [],
      plannedRecipeIds: [],
    }
    for (const row of rows.rows) hydrated[actionFields[row.action]].push(row.recipe_id)
    return hydrated
  }

  async function getOrCreateUserState(clientId: string): Promise<UserState> {
    const initial = createDefaultUserState(clientId, assetBaseUrl)
    const result = await pool.query<{ payload: UserState; actions_migrated: boolean }>(
      `INSERT INTO fandazi_user_state (client_id, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (client_id) DO UPDATE SET client_id = EXCLUDED.client_id
       RETURNING payload, actions_migrated`,
      [clientId, JSON.stringify(initial)],
    )
    const row = result.rows[0]
    const state = sanitizeUserRecipeIds(row?.payload ?? initial, recipeIds)
    if (!row?.actions_migrated) await replaceUserActions(clientId, state)
    return hydrateUserActions(state)
  }

  async function recommendRecipe(clientId: string, status: string, excludeIds: number[] = []): Promise<Recipe> {
    const recent = await pool.query<{ recipe_id: number }>(
      `SELECT recipe_id FROM fandazi_recommendation_history
       WHERE client_id = $1 ORDER BY seen_at DESC LIMIT 8`,
      [clientId],
    )
    const recommendation = selectRecommendation(
      recipes,
      status,
      [...new Set([...recent.rows.map(row => row.recipe_id), ...excludeIds])],
    )
    await pool.query(
      `INSERT INTO fandazi_recommendation_history (client_id, recipe_id, seen_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (client_id, recipe_id) DO UPDATE SET seen_at = EXCLUDED.seen_at`,
      [clientId, recommendation.id],
    )
    return { ...recommendation }
  }

  return {
    async bootstrap(clientId, status): Promise<BootstrapPayload> {
      return {
        quickCategories: categories.filter(category => category.source === 'quick'),
        cookingCategories: categories.filter(category => category.source === 'cooking'),
        takeoutCategories: categories.filter(category => category.source === 'takeout'),
        statusOptions: statuses,
        recommendation: await recommendRecipe(clientId, status),
      }
    },
    recommend: recommendRecipe,
    async list(query: RecipeQuery): Promise<Recipe[]> {
      return createFilteredList(recipes, query)
    },
    async findById(id: number): Promise<Recipe | undefined> {
      return recipes.find(recipe => recipe.id === id)
    },
    async getUserState(clientId) {
      return getOrCreateUserState(clientId)
    },
    async updateUserState(clientId: string, update: UserStateUpdate) {
      const current = await getOrCreateUserState(clientId)
      const next = sanitizeUserRecipeIds({
        ...current,
        ...update,
        clientId,
        profile: update.profile ? { ...current.profile, ...update.profile } : current.profile,
      }, recipeIds)
      const result = await pool.query<{ payload: UserState }>(
        `UPDATE fandazi_user_state
         SET payload = $2::jsonb, updated_at = NOW()
         WHERE client_id = $1
         RETURNING payload`,
        [clientId, JSON.stringify(next)],
      )
      await replaceUserActions(clientId, next)
      return hydrateUserActions(result.rows[0]?.payload ?? next)
    },
    async claimUserState(sourceClientId, userClientId) {
      const source = await getOrCreateUserState(sourceClientId)
      const claimed = { ...source, clientId: userClientId }
      await pool.query(
        `INSERT INTO fandazi_user_state (client_id, payload, actions_migrated)
         VALUES ($1, $2::jsonb, FALSE)
         ON CONFLICT (client_id) DO NOTHING`,
        [userClientId, JSON.stringify(claimed)],
      )
      return getOrCreateUserState(userClientId)
    },
    async getPlan(clientId, date) {
      return mapPlanPayload(recipes, await getOrCreateUserState(clientId), date)
    },
    async listTakeout(category) {
      const result = await pool.query<{ payload: TakeoutShop }>(
        `SELECT payload FROM fandazi_takeout_shop
         WHERE $1::TEXT IS NULL OR payload->>'categoryId' = $1
         ORDER BY (payload->>'score')::NUMERIC DESC, shop_id`,
        [category ?? null],
      )
      return result.rows.map(row => row.payload)
    },
    async close() {
      await pool.end()
    },
  }
}

function createFilteredList(recipes: Recipe[], query: RecipeQuery): Recipe[] {
  const keyword = query.keyword?.trim().toLocaleLowerCase()
  const result = recipes.filter(recipe => (
    (!query.category || recipe.categoryIds.includes(query.category))
    && (!query.status || recipe.statusIds.includes(query.status))
    && (!keyword || recipe.name.toLocaleLowerCase().includes(keyword) || recipe.tags.some(tag => tag.toLocaleLowerCase().includes(keyword)))
  ))
  if (query.sort === 'latest') result.sort((a, b) => b.id - a.id)
  if (query.sort === 'popular') result.sort((a, b) => b.popularity - a.popularity)
  return result.slice(0, query.limit ?? 50)
}
