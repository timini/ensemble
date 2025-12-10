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
                    'prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
                    // Paragraphs
                    'prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed',
                    // Lists
                    'prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-700 dark:prose-li:text-gray-300',
                    // Links
                    'prose-a:text-blue-600 hover:prose-a:text-blue-800 dark:prose-a:text-blue-400',
                    // Code
                    'prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
                    // Blockquotes
                    'prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:py-1',
                    // Tables
                    'prose-table:border-collapse prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700',
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
