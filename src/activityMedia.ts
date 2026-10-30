export type ActivityPhoto = {
  src: string
  alt: string
  kind: "photo" | "poster"
  source?: string
}

export const maxActivityPhotos = 30

export type ActivityMedia = {
  label: string
  image: string
  alt: string
  imageKind: "photo" | "poster"
  imageSource: string
  additionalImages?: readonly ActivityPhoto[]
}

export default function activityPhotos(
  activity: ActivityMedia,
  publishedImage?: string,
  publishedGallery?: readonly ActivityPhoto[],
): ActivityPhoto[] {
  if (publishedGallery !== undefined) {
    const seen = new Set<string>()
    return publishedGallery
      .filter((photo) => {
        const src = photo.src.trim()
        if (!src || seen.has(src)) return false
        seen.add(src)
        return true
      })
      .slice(0, maxActivityPhotos)
  }
  // Existing admin uploads remain authoritative; do not mix in unrelated defaults.
  if (publishedImage?.trim()) {
    return [
      {
        src: publishedImage.trim(),
        alt: `${activity.label} at the IIUC Economics & Banking Club`,
        kind: "photo",
      },
    ]
  }
  const candidates: ActivityPhoto[] = [
    {
      src: activity.image,
      alt: activity.alt,
      kind: activity.imageKind,
      source: activity.imageSource,
    },
    ...(activity.additionalImages ?? []),
  ]
  const seen = new Set<string>()
  return candidates
    .filter((photo) => {
      const src = photo.src.trim()
      if (!src || seen.has(src)) return false
      seen.add(src)
      return true
    })
    .map((photo) => ({ ...photo, src: photo.src.trim() }))
}
