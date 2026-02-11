import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Heading } from '../../atoms/Heading';
import { Button } from '../../atoms/Button';
import { Copy, Check } from 'lucide-react';

export interface PromptCardProps {
    /** The prompt text to display */
    prompt: string;
    /** Optional heading text */
    heading?: string;
    /** Whether to show the copy button */
    showCopy?: boolean;
}

/**
 * PromptCard organism for displaying the user's prompt.
 *
 * Shows the prompt in a styled card with optional copy functionality.
 * Matches the wireframe design from review page.
 *
 * @example
 * ```tsx
 * <PromptCard
 *   prompt="What is the meaning of life?"
 *   showCopy={true}
 * />
 * ```
 */
export const PromptCard = React.forwardRef<HTMLDivElement, PromptCardProps>(
    ({ prompt, heading, showCopy = true }, ref) => {
        const { t } = useTranslation();
        const [copied, setCopied] = React.useState(false);

        const handleCopy = async () => {
            try {
                await navigator.clipboard.writeText(prompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy prompt:', err);
            }
        };

        return (
            <Card ref={ref} data-testid="prompt-card">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Heading level={3} size="md" className="mb-0">
                            {heading || t('organisms.promptCard.heading')}
                        </Heading>
                        {showCopy && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                className="text-muted-foreground hover:text-foreground"
                                data-testid="copy-prompt-button"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4 mr-1" />
                                        {t('organisms.promptCard.copied')}
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-1" />
                                        {t('organisms.promptCard.copy')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                        <p className="text-foreground whitespace-pre-wrap">
                            {prompt}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }
);

PromptCard.displayName = 'PromptCard';
