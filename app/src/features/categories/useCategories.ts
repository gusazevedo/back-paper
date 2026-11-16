import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { supabase } from '../../lib/supabase';

export type Category = { slug: string; label: string };

/** The fixed list of 12 categories (R-CAT), in display order. */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    staleTime: Infinity,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('slug,label')
        .order('sort');
      if (error) throw error;
      return data;
    },
  });
}
