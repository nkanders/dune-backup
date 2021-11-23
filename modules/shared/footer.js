import React from 'react'

import ThemeSwitch from './theme-switch'

import Menu from '@blocks/navigation/menu'
import Newsletter from '@modules/newsletter'

const Footer = ({ data = {} }) => {
  const { blocks, backgroundColor, gridColor } = data
  return (
    <footer
      className="footer"
      role="contentinfo"
      style={
        backgroundColor
          ? {
              backgroundColor: backgroundColor.hex,
            }
          : {}
      }
    >
      <div
        className="footer--grid"
        style={
          gridColor
            ? {
                backgroundColor: gridColor.hex,
              }
            : {}
        }
      >
        {blocks.map((block, key) => (
          <div
            key={key}
            className="footer--block"
            style={
              block.backgroundColor
                ? {
                    backgroundColor: block.backgroundColor.hex,
                  }
                : { backgroundColor: '' }
            }
          >
            {block.title && <p className="is-h4">{block.title}</p>}

            {block.menu?.items && (
              <Menu items={block.menu.items} className="menu-footer" />
            )}

            {block.newsletter && <Newsletter data={block.newsletter} />}

            {/* Put our extras in the last block */}
            {key === 3 && (
              <div className="footer--extras">
                <ThemeSwitch />

                <div className="footer--disclaimer">
                  <p>&copy; {new Date().getFullYear()}. All Rights Reserved.</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </footer>
  )
}

export default Footer
