# 饭搭子设计系统

## Tokens

- Primary: `#FF900B`
- Page background: `#FFF7ED`
- Main text: `#333333`
- Card: `#FFFFFF`
- Success/health tone: use the values in `frontend/src/styles/tokens.scss`

Treat `frontend/src/styles/tokens.scss` as the code source of truth. Add a semantic token instead of repeating a new shared literal across pages.

## Typography

- Page title: about `40–44rpx`, bold.
- Module title: about `30–32rpx`, bold.
- Body: `28rpx`.
- Supporting copy and labels: at least `24rpx`.
- Preserve hierarchy through weight and spacing before shrinking text.

## Radius and spacing

- Large card: about `28–32rpx`.
- Small card: about `24rpx`.
- Pills use a full radius only when the design is intentionally capsule-shaped.
- Use an 8rpx-derived spacing rhythm where practical.

## Shared chrome

- Use `AppHeader` for capsule-aware top navigation.
- Header action hit area: `64rpx`; visual icon: `44rpx`.
- Use `AppTabBar` for non-Tab subpages that visually retain bottom navigation.
- Native WeChat custom TabBar files live under `frontend/src/custom-tab-bar/`.

## Image handling

- Inspect both pixel dimensions and transparent internal padding.
- Use `aspectFill` for food covers and `aspectFit` for icons.
- Prefer stable semantic English filenames.
- Never fix a padded PNG by making every page’s icon container different.
