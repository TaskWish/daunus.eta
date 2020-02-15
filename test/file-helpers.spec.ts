import { render, templates, compile } from '../src/index'
import { defaultConfig } from '../src/config'

var fs = require('fs'),
  path = require('path')

templates.define('test-template', compile('HEY {{it.name}}'))

describe('include works', () => {
  it('simple parser works with "includeFile"', async () => {
    var renderedTemplate = render(
      '{{~includeFile("simple", it)/}}',
      { name: 'Ben' },
      { filename: path.join(__dirname, 'templates/placeholder.sqrl') }
    )

    expect(renderedTemplate).toEqual('Hi Ben')
  })

  it('"includeFile" works with "views" array', async () => {
    var renderedTemplate = render(
      '{{~includeFile("randomtemplate", it)/}}',
      { user: 'Ben' },
      {
        filename: path.join(__dirname, 'templates/placeholder.sqrl'),
        views: [path.join(__dirname, 'templates'), path.join(__dirname, 'othertemplates')]
      }
    )

    expect(renderedTemplate).toEqual('This is a random template. Hey Ben')
  })

  it('simple parser works with "include"', async () => {
    var renderedTemplate = render('{{~include("test-template", it)/}}', { name: 'Ben' })

    expect(renderedTemplate).toEqual('HEY Ben')
  })

  test('throws if helper "includeFile" has blocks', () => {
    expect(() => {
      render('{{~includeFile("test-template", it)}} {{#block1}} {{/includeFile}}', {
        name: 'stuff'
      })
    }).toThrow()
  })

  test('throws if helper "include" has blocks', () => {
    expect(() => {
      render('{{~include("test-template", it)}} {{#block2}} {{/includeFile}}', { name: 'stuff' })
    }).toThrow()
  })
})