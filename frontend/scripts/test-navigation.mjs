import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

function evaluateSource(path, context, platform = 'MP-WEIXIN') {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const active = [true]
  const filtered = source.split('\n').filter(line => {
    const conditional = line.match(/^\s*\/\/ #(ifdef|ifndef) ([\w-]+)/)
    if (conditional) {
      const match = conditional[2] === platform
      active.push(active.at(-1) && (conditional[1] === 'ifdef' ? match : !match))
      return false
    }
    if (/^\s*\/\/ #endif/.test(line)) { active.pop(); return false }
    return active.at(-1)
  }).join('\n').replace(/^import .*\n/gm, '').replace(/^export /gm, '')
  runInNewContext(stripTypeScriptTypes(filtered), context)
  return context
}

function recipeContext(stackLength, failedBack = false) {
  const calls = []
  const context = evaluateSource('../src/config/recipe-navigation.ts', {
    getCurrentPages: () => Array.from({ length: stackLength }, () => ({})),
    uni: {
      switchTab: options => calls.push(['switchTab', options.url]),
      navigateTo: options => calls.push(['navigateTo', options.url]),
      navigateBack: options => { calls.push(['navigateBack']); if (failedBack) options.fail() },
    },
  })
  return { context, calls }
}

test('cold shared recipe and legacy deep links return to the meal home', () => {
  for (const shared of [true, false]) {
    const { context, calls } = recipeContext(1)
    context.returnFromRecipeDetail(shared)
    assert.deepEqual(calls, [['switchTab', '/pages/index/index']])
  }
})

test('warm share entry does not return to a previously open profile or list', () => {
  const { context, calls } = recipeContext(3)
  context.returnFromRecipeDetail(true)
  assert.deepEqual(calls, [['switchTab', '/pages/index/index']])
})

test('ordinary tutorial browsing returns to its source page', () => {
  const { context, calls } = recipeContext(2)
  context.returnFromRecipeDetail()
  assert.deepEqual(calls, [['navigateBack']])
})

test('failed back navigation falls back to the registered home tab', () => {
  const { context, calls } = recipeContext(2, true)
  context.returnFromRecipeDetail()
  assert.deepEqual(calls, [['navigateBack'], ['switchTab', '/pages/index/index']])
})

test('tutorials open real IDs as subpages and reject invalid IDs', () => {
  const { context, calls } = recipeContext(1)
  context.openRecipeDetail(28002)
  context.openRecipeDetail(0)
  context.openRecipeDetail(NaN)
  assert.deepEqual(calls, [['navigateTo', '/pages/recipe/detail?id=28002']])
})

test('new recipe shares carry a share-entry marker', () => {
  const source = readFileSync(new URL('../src/pages/recipe/detail.vue', import.meta.url), 'utf8')
  assert.match(source, /entry=share/)
  assert.match(source, /fromShare\.value = query\?\.entry === 'share'/)
  assert.doesNotMatch(source, /redirectTo\(\{ url: '\/pages\/recipe\/list'/)
})

test('WeChat tab synchronization never shows a second system tab bar', () => {
  const hooks = [], selections = []
  const context = evaluateSource('../src/composables/useTabBarSelection.ts', {
    onShow: callback => hooks.push(callback), onReady: callback => hooks.push(callback),
    getCurrentPages: () => [{ getTabBar: () => ({ setData: data => selections.push(data.selected) }) }],
    uni: { showTabBar: () => assert.fail('Do not show system tab bar'), hideTabBar: () => assert.fail('Do not hide WeChat custom tab bar') },
  })
  context.useTabBarSelection(2)
  hooks.forEach(callback => callback())
  assert.deepEqual(selections, [2, 2])
})

test('App/H5 hide their system bar when using the page navigation component', () => {
  const hooks = [], calls = []
  const context = evaluateSource('../src/composables/useTabBarSelection.ts', {
    onShow: callback => hooks.push(callback), onReady: callback => hooks.push(callback),
    uni: { showTabBar: () => assert.fail('Do not duplicate page navigation'), hideTabBar: () => calls.push('hide') },
  }, 'H5')
  context.useTabBarSelection(2)
  hooks.forEach(callback => callback())
  assert.deepEqual(calls, ['hide', 'hide'])
})

test('custom tab bar resolves selection from the actual page on attach and show', () => {
  let component, route = 'pages/user/user'
  const calls = []
  runInNewContext(readFileSync(new URL('../src/custom-tab-bar/index.js', import.meta.url), 'utf8'), {
    Component: value => { component = value },
    getCurrentPages: () => [{ route }],
    wx: { switchTab: options => calls.push(options.url) },
  })
  const instance = { data: structuredClone(component.data), setData(data) { Object.assign(this.data, data) }, ...component.methods }
  component.lifetimes.attached.call(instance)
  assert.equal(instance.data.selected, 2)
  route = 'pages/index/index'
  component.pageLifetimes.show.call(instance)
  assert.equal(instance.data.selected, 0)
  // A stale highlighted index must not prevent navigation to another tab.
  instance.data.selected = 2
  instance.switchTab({ currentTarget: { dataset: { index: 2, path: '/pages/user/user' } } })
  assert.deepEqual(calls, ['/pages/user/user'])
  route = 'pages/user/user'
  instance.switchTab({ currentTarget: { dataset: { index: 2, path: '/pages/user/user' } } })
  assert.equal(calls.length, 1)
})
