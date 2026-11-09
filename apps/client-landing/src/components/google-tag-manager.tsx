const CONTAINER_ID = /^GTM-[A-Z0-9]{4,12}$/

export function GoogleTagManager({
  containerId,
}: {
  containerId?: string | null
}) {
  if (!containerId || !CONTAINER_ID.test(containerId)) return null

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtm.js?id=${containerId}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());",
        }}
      />
    </>
  )
}
