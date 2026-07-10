import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/tools/(.*)',
  '/league-market(.*)',
  '/player/(.*)',
  '/about(.*)',
  '/hub-league/demo(.*)',
  '/api/hub-leagues/demo(.*)',
  '/api/hub-league-season/demo(.*)',
  '/api/sleeper/league/demo(.*)',
  '/api/start-sit/(.*)',
  '/api/dynasty-rankings/(.*)',
  '/api/sleeper/(.*)',
  '/api/trade-analyzer/(.*)',
  '/api/players/(.*)',
  '/api/scouting/(.*)',
])



export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};