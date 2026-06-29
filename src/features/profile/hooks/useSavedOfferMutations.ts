import { useMutation } from '@tanstack/react-query'
import { deleteSavedOffer, postSavedOffer } from '../api/savedOffersApi'

export function useSaveOfferMutation() {
  return useMutation({
    mutationFn: postSavedOffer,
  })
}

export function useUnsaveOfferMutation() {
  return useMutation({
    mutationFn: deleteSavedOffer,
  })
}
