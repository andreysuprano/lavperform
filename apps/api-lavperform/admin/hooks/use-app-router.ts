"use client"

import { usePathname, useRouter } from "next/navigation"
import { useMemo } from "react"

import {
  getPathnameFromHref,
  startNavigation,
} from "@/services/navigation-progress"

export function useAppRouter() {
  const router = useRouter()
  const pathname = usePathname()

  return useMemo(() => {
    function navigate(
      method: "push" | "replace",
      href: string,
      options?: Parameters<typeof router.replace>[1]
    ) {
      const targetPathname = getPathnameFromHref(href)
      if (targetPathname !== pathname) {
        startNavigation(targetPathname)
      }

      router[method](href, options as never)
    }

    return {
      push: (href: string, options?: Parameters<typeof router.push>[1]) =>
        navigate("push", href, options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
        navigate("replace", href, options),
      back: router.back,
      forward: router.forward,
      refresh: router.refresh,
      prefetch: router.prefetch,
    }
  }, [pathname, router])
}
