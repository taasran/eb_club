import {
  sourceInfo,
  sourceArchive,
} from "../../private-downloads/source-snapshot.mjs"
import { serveProjectSource } from "../lib/project-source.mjs"

// A static import makes the generated ZIP an explicit, private bundle dependency.
// It is never copied into dist or served without the authorization check.
export const handler = (event) =>
  serveProjectSource(event, {
    info: sourceInfo,
    archive: () => sourceArchive,
  })
