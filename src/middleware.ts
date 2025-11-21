import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  
  // Extract subdomain (handle both production and development)
  const parts = hostname.split(".");
  const subdomain = parts.length > 2 ? parts[0] : 
                     hostname.includes("localhost") ? hostname.split(".")[0] : null;
  
  // Create response for session handling
  let response = NextResponse.next({ request });
  
  // Create Supabase client for authentication check
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
          response.cookies.set(name, value, options);
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
          response.cookies.set(name, "", {
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );
  
  // Get user for authentication check
  const { data: { user } } = await supabase.auth.getUser();
  
  // Handle subdomain routing
  if (subdomain && subdomain !== "www" && !hostname.includes("vercel.app")) {
    const subdomainRoutes: Record<string, { path: string; loginPath: string; allowedRoles?: string[] }> = {
      admin: { 
        path: "/dashboard", 
        loginPath: "/login",
        allowedRoles: ["admin", "bus_owner", "financial"]
      },
      driver: { 
        path: "/mobile/driver", 
        loginPath: "/mobile/driver/login",
        allowedRoles: ["driver", "admin"]
      },
      assistant: { 
        path: "/mobile/assistant", 
        loginPath: "/mobile/assistant/login",
        allowedRoles: ["assistant", "admin"]
      },
      scanner: { 
        path: "/scanner", 
        loginPath: "/scanner/login",
        allowedRoles: ["driver", "assistant", "admin"]
      },
      pos: { 
        path: "/pos", 
        loginPath: "/pos/login",
        allowedRoles: ["pos_agent", "admin"]
      },
    };
    
    const routeConfig = subdomainRoutes[subdomain];
    
    if (routeConfig) {
      // Check if we're on a login page or public route
      const isLoginPage = url.pathname.includes("/login");
      const isPublicRoute = url.pathname === "/" || 
                           url.pathname.startsWith("/api/") ||
                           url.pathname.startsWith("/_next/") ||
                           url.pathname.startsWith("/manifest") ||
                           url.pathname.includes(".json") ||
                           url.pathname.includes(".js");
      
      // If not authenticated and not on login/public route, redirect to login
      if (!user && !isLoginPage && !isPublicRoute) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = routeConfig.loginPath;
        return NextResponse.redirect(loginUrl);
      }
      
      // If authenticated, check role
      if (user && routeConfig.allowedRoles && !isPublicRoute) {
        // Get user role from database
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        
        const role = userData?.role || user.user_metadata?.role;
        
        // If user doesn't have allowed role and not on login page, redirect to login
        if (role && !routeConfig.allowedRoles.includes(role) && !isLoginPage) {
          const loginUrl = request.nextUrl.clone();
          loginUrl.pathname = routeConfig.loginPath;
          return NextResponse.redirect(loginUrl);
        }
      }
      
      // Determine the path to rewrite to
      let newPath = routeConfig.path;
      
      if (url.pathname === "/") {
        // Root path: if not authenticated, redirect to login (don't rewrite)
        if (!user && !isLoginPage) {
          const loginUrl = request.nextUrl.clone();
          loginUrl.pathname = routeConfig.loginPath;
          // Return redirect instead of rewrite
          const redirectResponse = NextResponse.redirect(loginUrl);
          // Copy cookies
          response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value, { ...cookie });
          });
          return redirectResponse;
        }
        // If authenticated, go to base path
        newPath = routeConfig.path;
      } else if (url.pathname === routeConfig.loginPath || isLoginPage) {
        // Already on login path, keep it
        newPath = routeConfig.loginPath;
      } else if (url.pathname.startsWith(routeConfig.path)) {
        // Already has the path prefix, use as is
        newPath = url.pathname;
      } else if (url.pathname.startsWith("/login")) {
        // Generic /login should go to specific login path
        newPath = routeConfig.loginPath;
      } else {
        // Add path prefix
        newPath = `${routeConfig.path}${url.pathname}`;
      }
      
      url.pathname = newPath;
      
      // Create rewrite response
      const rewriteResponse = NextResponse.rewrite(url);
      
      // Copy all cookies from session response
      response.cookies.getAll().forEach((cookie) => {
        rewriteResponse.cookies.set(cookie.name, cookie.value, {
          ...cookie,
        });
      });
      
      // Copy important headers
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "content-length") {
          rewriteResponse.headers.set(key, value);
        }
      });
      
      return rewriteResponse;
    }
  }
  
  // For main domain, continue with normal flow
  // Allow public routes
  const publicRoutes = [
    "/",
    "/search",
    "/trips",
    "/checkout",
    "/tickets",
    "/login",
    "/displays",
    "/api/public",
    "/api/mobile",
  ];
  
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  
  // Protect /profile route
  if (!user && request.nextUrl.pathname.startsWith("/profile")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }
  
  // Protect /dashboard route
  if (!user && !isPublicRoute && request.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
