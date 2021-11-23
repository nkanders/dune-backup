import React, { useState, useEffect } from 'react'
import Router from 'next/router'
import Head from 'next/head'
import { ApolloProvider } from 'react-apollo';
import TagManager from 'react-gtm-module'
import { ThemeProvider } from 'next-themes'
import { LazyMotion, domAnimation, AnimatePresence } from 'framer-motion'

import '../styles/tailwind.css'
import '../styles/app.css'

import { apolloClient, SiteContextProvider } from '@lib/context'
import { isBrowser } from '@lib/helpers'
import Cart from '@modules/shop/cart'

const MyApp = ({ Component, pageProps, router }) => {
  const [isLoading, setLoading] = useState(false)

  // intelligently add focus states if keyboard is used
  const handleFirstTab = (event) => {
    if (event.keyCode === 9) {
      if (isBrowser) {
        document.body.classList.add('is-tabbing')
        window.removeEventListener('keydown', handleFirstTab)
      }
    }
  }
  
  useEffect(() => {
    if (process.env.GTM_ID) {
      TagManager.initialize({ gtmId: process.env.GTM_ID });
    }

    // Setup Next router events
    Router.events.on('routeChangeStart', (url) => {
      // Bail if we're just changing a URL parameter
      if (
        url.indexOf('?') > -1 &&
        url.split('?')[0] === router.asPath.split('?')[0]
      )
        return

      // Otherwise, start loading
      setLoading(true)
    })

    Router.events.on('routeChangeComplete', () => {
      setTimeout(() => setLoading(false), 400) // accounts for page transition
    })

    Router.events.on('routeChangeError', () => {
      setLoading(false)
    })

    window.addEventListener('keydown', handleFirstTab)
    return () => {
      window.removeEventListener('keydown', handleFirstTab)
    }
  }, [])

  // The scroll location on the page is not restored on history changes
  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    
    const prevPath = localStorage.getItem("currentPath") || '/';
    localStorage.setItem('prevPath', prevPath)
    localStorage.setItem('currentPath', router.asPath)
  }, [router.asPath])

  // Trigger our loading class
  useEffect(() => {
    if (isBrowser) {
      document.documentElement.classList.toggle('is-loading', isLoading)
    }
  }, [isLoading])

  return (
    <ThemeProvider disableTransitionOnChange>
      <ApolloProvider client={apolloClient}>
        <SiteContextProvider data={{ ...pageProps?.data?.site }}>
          <LazyMotion features={domAnimation}>
            {isLoading && (
              <Head>
                <title>Loading...</title>
              </Head>
            )}
            <AnimatePresence
              exitBeforeEnter
              onExitComplete={() => {
                window.scrollTo(0, 0)
                document.body.classList.remove('overflow-hidden')
              }}
            >
              <Component key={router.asPath.split('?')[0]} {...pageProps} />
            </AnimatePresence>

            <Cart data={{ ...pageProps?.data?.site }} />
          </LazyMotion>
        </SiteContextProvider>
      </ApolloProvider>
    </ThemeProvider>
  )
}

export default MyApp
