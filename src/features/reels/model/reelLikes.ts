import type { ReelLikeBundle } from '../Dtos/reelLikes'

export function reelLikeReducer(
  state: ReelLikeBundle,
  action: { type: 'toggle'; reelId: string },
): ReelLikeBundle {
  if (action.type !== 'toggle') return state
  const { reelId } = action
  const was = !!state.liked[reelId]
  return {
    liked: { ...state.liked, [reelId]: !was },
    counts: {
      ...state.counts,
      [reelId]: Math.max(0, (state.counts[reelId] ?? 0) + (was ? -1 : 1)),
    },
  }
}
