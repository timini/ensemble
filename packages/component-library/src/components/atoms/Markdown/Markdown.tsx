'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../../lib/utils';

export interface MarkdownProps {
    /** The markdown content to render */
    children: string;
    /** Additional CSS classes */
    className?: string;
    /** Test id for the container. Defaults to "markdown". */
    'data-testid'?: string;
}

/**
 * Markdown atom for rendering markdown content with proper styling.
 *
 * Raw HTML in the source is not rendered, so model output cannot inject markup.
 *
 * Supports GitHub Flavored Markdown (GFM) including:
 * - Tables
 * - Strikethrough
 * - Task lists
 * - Autolinks
 * 
 * @example
 * ```tsx
 * <Markdown>
 *   # Hello World
 *   
 *   This is **bold** and *italic* text.
 * </Markdown>
 * ```
 */
export const Markdown = React.forwardRef<HTMLDivElement, MarkdownProps>(
    ({ children, className, 'data-testid': testId = 'markdown' }, ref) => {
        return (
            <div
                ref={ref}
                data-testid={testId}
                className={cn(
                    // The app has no typography plugin, so block spacing and
                    // element styles are set here with arbitrary variants.
                    'max-w-none break-words [&>*+*]:mt-3',
                    '[&_h1]:text-heading [&_h2]:text-lead [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:text-foreground [&_h2]:text-foreground',
                    '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li+li]:mt-1 [&_li>ul]:mt-1',
                    '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80',
                    '[&_strong]:font-semibold',
                    '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]',
                    '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
                    '[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
                    '[&_table]:w-full [&_table]:border-collapse [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2',
                    className
                )}
            >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {children}
                </ReactMarkdown>
            </div>
        );
    }
);

Markdown.displayName = 'Markdown';
