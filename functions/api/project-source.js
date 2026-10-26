import {
  sourceInfo,
  sourceArchive,
} from "../../private-downloads/source-snapshot.mjs"
import { serveProjectSource } from "../../netlify/lib/project-source.mjs"

const toResponse = ({ statusCode, headers, body, isBase64Encoded }) =>
  new Response(
    isBase64Encoded
      ? Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
      : statusCode === 204
        ? null
        : body,
    { status: statusCode, headers },
  )

export const onRequest = async ({ request }) => {
  const url = new URL(request.url)
  return toResponse(
    await serveProjectSource(
      {
        httpMethod: request.method,
        headers: Object.fromEntries(request.headers),
        queryStringParameters: Object.fromEntries(url.searchParams),
      },
      { info: sourceInfo, archive: () => sourceArchive },
    ),
  )
}
