import { queryKeys } from "@/api/query-keys";
import { userApi } from "@/api/user";
import { useSuspenseQuery } from "@tanstack/react-query";


function useUser() {
  return useSuspenseQuery({
    queryKey: queryKeys.auth.me,
    queryFn: userApi.getMe,
  });
}

export { useUser };
