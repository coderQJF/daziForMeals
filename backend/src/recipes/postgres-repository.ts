import pg from 'pg'
import { categorySeeds, recipeSeeds, statusSeeds } from './seed.js'
import { takeoutShops } from '../experience/seed.js'
import { createDefaultUserState, mapCategory, mapPlanPayload, mapSeedRecipe } from './repository.js'
import type { BootstrapPayload, Category, Recipe, RecipeQuery, RecipeRepository, StatusOption, UserState, UserStateUpdate } from './types.js'

const { Pool } = pg

export async function createPostgresRecipeRepository(databaseUrl: string, assetBaseUrl: string): Promise<RecipeRepository> {
  const pool = new Pool({ connectionString: databaseUrl })

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
    CREATE TABLE IF NOT EXISTS fandazi_user_state (
      client_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const seedItems = [
    ...categorySeeds.map((payload, index) => ({ type: 'category', id: payload.id, payload, sortOrder: index })),
    ...statusSeeds.map((payload, index) => ({ type: 'status', id: payload.id, payload, sortOrder: index })),
    ...recipeSeeds.map(payload => ({ type: 'recipe', id: String(payload.id), payload, sortOrder: payload.sortOrder })),
  ]

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const item of seedItems) {
      await client.query(
        `INSERT INTO fandazi_content (content_type, content_id, payload, sort_order)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (content_type, content_id) DO NOTHING`,
        [item.type, item.id, JSON.stringify(item.payload), item.sortOrder],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  const content = await pool.query<{ content_type: string; payload: unknown }>(
    'SELECT content_type, payload FROM fandazi_content ORDER BY sort_order, content_id',
  )
  const seeds = content.rows
    .filter(row => row.content_type === 'recipe')
    .map(row => row.payload as typeof recipeSeeds[number])
  const recipes = seeds.map(seed => mapSeedRecipe(seed, assetBaseUrl))
  const categories = content.rows
    .filter(row => row.content_type === 'category')
    .map(row => mapCategory(row.payload as Category, assetBaseUrl))
  const statuses = content.rows
    .filter(row => row.content_type === 'status')
    .map(row => row.payload as StatusOption)

  async function getOrCreateUserState(clientId: string): Promise<UserState> {
    const initial = createDefaultUserState(clientId, assetBaseUrl)
    const result = await pool.query<{ payload: UserState }>(
      `INSERT INTO fandazi_user_state (client_id, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (client_id) DO UPDATE SET client_id = EXCLUDED.client_id
       RETURNING payload`,
      [clientId, JSON.stringify(initial)],
    )
    return result.rows[0]?.payload ?? initial
  }

  return {
    async bootstrap(status, offset): Promise<BootstrapPayload> {
      const matches = recipes.filter(recipe => recipe.statusIds.includes(status))
      const candidates = matches.length ? matches : recipes
      const recommendation = candidates[offset % candidates.length]
      if (!recommendation) throw new Error('Recipe database is empty')
      return {
        quickCategories: categories.filter(category => category.source === 'quick'),
        cookingCategories: categories.filter(category => category.source === 'cooking'),
        takeoutCategories: categories.filter(category => category.source === 'takeout'),
        statusOptions: statuses,
        recommendation,
      }
    },
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
      const next: UserState = {
        ...current,
        ...update,
        clientId,
        profile: update.profile ? { ...current.profile, ...update.profile } : current.profile,
      }
      const result = await pool.query<{ payload: UserState }>(
        `UPDATE fandazi_user_state
         SET payload = $2::jsonb, updated_at = NOW()
         WHERE client_id = $1
         RETURNING payload`,
        [clientId, JSON.stringify(next)],
      )
      return result.rows[0]?.payload ?? next
    },
    async claimUserState(sourceClientId, userClientId) {
      const source = await getOrCreateUserState(sourceClientId)
      const claimed = { ...source, clientId: userClientId }
      await pool.query(
        `INSERT INTO fandazi_user_state (client_id, payload)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (client_id) DO NOTHING`,
        [userClientId, JSON.stringify(claimed)],
      )
      return getOrCreateUserState(userClientId)
    },
    async getPlan(clientId, date) {
      return mapPlanPayload(recipes, await getOrCreateUserState(clientId), date, assetBaseUrl)
    },
    async listTakeout(category) {
      return takeoutShops.filter(shop => !category || shop.categoryId === category).map(shop => ({ ...shop }))
    },
    async close() {
      await pool.end()
    },
  }
}

function createFilteredList(recipes: Recipe[], query: RecipeQuery): Recipe[] {
  const keyword = query.keyword?.trim().toLocaleLowerCase()
  const result = recipes.filter(recipe => (
    (!query.category || recipe.categoryId === query.category)
    && (!query.status || recipe.statusIds.includes(query.status))
    && (!keyword || recipe.name.toLocaleLowerCase().includes(keyword) || recipe.tags.some(tag => tag.toLocaleLowerCase().includes(keyword)))
  ))
  if (query.sort === 'latest') result.sort((a, b) => b.id - a.id)
  if (query.sort === 'popular') result.sort((a, b) => a.cookTime - b.cookTime)
  return result.slice(0, query.limit ?? 50)
}
