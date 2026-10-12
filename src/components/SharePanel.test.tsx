import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SharePanel } from './SharePanel'

// react-dom/server has no window, so this also proves the trigger renders when the
// component is evaluated outside a browser.
describe('share panel', () => {
  it('starts collapsed as a scan-code trigger', () => {
    const html = renderToStaticMarkup(createElement(SharePanel))
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-label="Show a code to scan this site"')
    expect(html).not.toContain('share-menu')
  })

  it('does not pull the encoder in until it is opened', () => {
    const html = renderToStaticMarkup(createElement(SharePanel))
    expect(html).not.toContain('正在生成二维码')
  })
})
