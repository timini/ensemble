import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Heading } from '../../atoms/Heading';
import { Text } from '../../atoms/Text';
import { Link } from '../../atoms/Link';
import { cn } from '@/lib/utils';

export interface Breadcrumb {
  label: string;
  href: string;
}

export interface PageHeroProps {
  /** Page title */
  title: string;
  /** Page description */
  description: string;
  /** Optional breadcrumb navigation items */
  breadcrumbs?: Breadcrumb[];
}

/**
 * PageHero organism for displaying page titles and descriptions.
 *
 * A centered hero section that displays the page title and description,
 * with optional breadcrumb navigation.
 *
 * @example
 * ```tsx
 * <PageHero
 *   title="Configure Your AI Ensemble"
 *   description="Choose your preferred mode and configure provider access."
 *   breadcrumbs={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Config', href: '/config' },
 *   ]}
 * />
 * ```
 */
export const PageHero = React.forwardRef<HTMLDivElement, PageHeroProps>(
  ({ title, description, breadcrumbs }, ref) => {
    const { t } = useTranslation();

    return (
      <div ref={ref} data-testid="page-hero">
        {/* Breadcrumb Navigation */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label={t('organisms.pageHero.breadcrumb')} className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
              {breadcrumbs.map((breadcrumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" aria-hidden="true" />
                  )}
                  <Link
                    href={breadcrumb.href}
                    variant="subtle"
                    className={cn(
                      index === breadcrumbs.length - 1
                        ? 'text-foreground font-medium no-underline'
                        : ''
                    )}
                  >
                    {breadcrumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Hero Section */}
        <div className="text-center mb-8">
          <Heading level={1} size="3xl" className="text-foreground mb-4">{title}</Heading>
          <Text color="muted">{description}</Text>
        </div>
      </div>
    );
  }
);

PageHero.displayName = 'PageHero';
