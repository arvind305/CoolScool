// Mock for next/navigation

// Mock router state
let currentPathname = '/';
let currentSearchParams = new URLSearchParams();

// Helper functions to control mock state in tests
export const mockNavigation = {
  setPathname: (pathname: string) => {
    currentPathname = pathname;
  },
  setSearchParams: (params: URLSearchParams | Record<string, string>) => {
    currentSearchParams = params instanceof URLSearchParams
      ? params
      : new URLSearchParams(params);
  },
  reset: () => {
    currentPathname = '/';
    currentSearchParams = new URLSearchParams();
  },
};

// Mock router object
const mockRouter = {
  push: jest.fn((url: string) => {
    currentPathname = url.split('?')[0];
    const searchString = url.split('?')[1];
    if (searchString) {
      currentSearchParams = new URLSearchParams(searchString);
    }
  }),
  replace: jest.fn((url: string) => {
    currentPathname = url.split('?')[0];
    const searchString = url.split('?')[1];
    if (searchString) {
      currentSearchParams = new URLSearchParams(searchString);
    }
  }),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(() => Promise.resolve()),
};

// useRouter hook mock
export const useRouter = jest.fn(() => mockRouter);

// usePathname hook mock
export const usePathname = jest.fn(() => currentPathname);

// useSearchParams hook mock
export const useSearchParams = jest.fn(() => currentSearchParams);

// useParams hook mock
export const useParams = jest.fn(() => ({}));

// useSelectedLayoutSegment hook mock
export const useSelectedLayoutSegment = jest.fn(() => null);

// useSelectedLayoutSegments hook mock
export const useSelectedLayoutSegments = jest.fn(() => []);

// redirect function mock
export const redirect = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

// notFound function mock
export const notFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

// Export the mock router for direct access in tests
export const getMockRouter = () => mockRouter;
