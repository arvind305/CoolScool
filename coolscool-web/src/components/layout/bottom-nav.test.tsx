import { render, screen } from '@testing-library/react';
import { BottomNav } from './bottom-nav';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/browse'),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
const mockedUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('BottomNav', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/browse');
  });

  it('shows Browse and Sign In for unauthenticated users', () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any);

    render(<BottomNav />);

    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('shows Browse, Dashboard, Profile for authenticated users', () => {
    mockedUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@test.com' } },
      status: 'authenticated',
    } as any);

    render(<BottomNav />);

    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  it('marks active tab based on pathname', () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any);
    mockedUsePathname.mockReturnValue('/browse');

    const { container } = render(<BottomNav />);

    const browseLink = container.querySelector('a[href="/browse"]');
    expect(browseLink).toHaveClass('active');
  });

  it('returns null during quiz', () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any);
    mockedUsePathname.mockReturnValue('/quiz?topic=T01.01');

    const { container } = render(<BottomNav />);

    expect(container.firstChild).toBeNull();
  });

  it('has proper aria label', () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as any);

    render(<BottomNav />);

    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();
  });
});
