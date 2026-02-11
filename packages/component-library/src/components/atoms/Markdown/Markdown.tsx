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
}

/**
 * Markdown atom for rendering markdown content with proper styling.
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
    ({ children, className }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'prose prose-sm dark:prose-invert max-w-none',
                    // Headings
                    'prose-headings:font-semibold prose-headings:text-foreground',
                    // Paragraphs
                    'prose-p:text-foreground/80 prose-p:leading-relaxed',
                    // Lists
                    'prose-ul:list-disc prose-ol:list-decimal prose-li:text-foreground/80',
                    // Links
                    'prose-a:text-primary hover:prose-a:text-primary/80',
                    // Code
                    'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
                    // Blockquotes
                    'prose-blockquote:border-l-primary prose-blockquote:bg-primary/10 prose-blockquote:py-1',
                    // Tables
                    'prose-table:border-collapse prose-th:bg-muted prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-border',
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
