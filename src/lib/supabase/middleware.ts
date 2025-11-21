import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, options);
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
          supabaseResponse.cookies.set(name, "", {
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow public routes without authentication
  const publicRoutes = [
    "/",
    "/search",
    "/trips",
    "/checkout",
    "/tickets", // Only for viewing individual tickets (sharing) - /tickets/[id]
    "/login",
    "/displays",
    "/api/public",
    "/api/mobile",
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Protect /profile route - requires authentication
  if (!user && request.nextUrl.pathname.startsWith("/profile")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Allow POS routes for authenticated users (will be checked in the route itself)
  const isPOSRoute = request.nextUrl.pathname.startsWith("/pos/");

  // Only redirect to login if it's an admin route and user is not authenticated
  if (
    !user &&
    !isPublicRoute &&
    !isPOSRoute &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    supabaseResponse.cookies.getAll().forEach(cookie => {
  //      myNewResponse.cookies.set(cookie.name, cookie.value, cookie)
  //    })
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse;
}

