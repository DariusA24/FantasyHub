import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/tools/(.*)',
  '/league-market(.*)',
  '/api/league-market/(.*)',
  '/league/(.*)',
  '/espn/(.*)',
  '/player/(.*)',
  '/about(.*)',
  // Read APIs the public league page depends on (writes are auth-checked in-handler)
  '/api/hub-leagues',
  '/api/hub-leagues/(.*)/champions',
  '/api/hub-leagues/(.*)/awards',
  '/api/hub-leagues/(.*)/manager-profile',
  // Public (ESPN) hub leagues are browsable by guests. The page shell + detail
  // GET + ESPN overview are public; private (Sleeper) hubs are gated in-handler
  // (the detail GET returns 401/403), and writes stay auth-checked in-handler.
  '/hub-league/(.*)',
  '/api/hub-leagues/:hubLeagueId',
  '/api/hub-leagues/(.*)/espn-overview',
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