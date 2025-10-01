import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { Heading } from '../../atoms/Heading';
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
    return (
      <div ref={ref} data-testid="page-hero">
        {/* Breadcrumb Navigation */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              {breadcrumbs.map((breadcrumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-400" aria-hidden="true" />
                  )}
                  <a
                    href={breadcrumb.href}
                    className={cn(
                      'hover:text-gray-900',
                      index === breadcrumbs.length - 1
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-600'
                    )}
                  >
                    {breadcrumb.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Hero Section */}
        <div className="text-center mb-8">
          <Heading level={2} size="3xl" className="text-gray-900 mb-4">{title}</Heading>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    );
  }
);

PageHero.displayName = 'PageHero';
