import { fn } from "@storybook/test";

export const usePathname = fn().mockReturnValue("/transfer");
export const useRouter = fn().mockReturnValue({
  push: fn(),
  replace: fn(),
  back: fn(),
  forward: fn(),
  refresh: fn(),
  prefetch: fn(),
});
export const useSearchParams = fn().mockReturnValue(new URLSearchParams());
export const useParams = fn().mockReturnValue({});
