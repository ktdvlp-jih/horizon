export const GUEST_DESIGN_KEY = 'horizon.guest.design'

export interface GuestDesignDraft {
  regionCode: string
  grid: string[][]
  designName?: string
}

export function saveGuestDraft(draft: GuestDesignDraft) {
  try {
    sessionStorage.setItem(GUEST_DESIGN_KEY, JSON.stringify(draft))
  } catch {
    /* ignore quota errors */
  }
}

export function loadGuestDraft(): GuestDesignDraft | null {
  try {
    const raw = sessionStorage.getItem(GUEST_DESIGN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GuestDesignDraft
  } catch {
    return null
  }
}

export function clearGuestDraft() {
  sessionStorage.removeItem(GUEST_DESIGN_KEY)
}
