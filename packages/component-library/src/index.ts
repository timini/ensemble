// Utilities
export { cn } from './lib/utils';

// Atoms (Level 1: Basic building blocks)
export { Button, buttonVariants, type ButtonProps } from './components/atoms/Button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/atoms/Card';
export { Input } from './components/atoms/Input';
export { Badge, badgeVariants, type BadgeProps } from './components/atoms/Badge';
export { Icon, iconVariants, type IconProps } from './components/atoms/Icon';
export { ProviderLogo, providerLogoVariants, type ProviderLogoProps, type ProviderLogoProvider } from './components/atoms/ProviderLogo';
export {
  EndpointLogo,
  endpointLogoVariants,
  ENDPOINT_LOGO_PRESETS,
  type EndpointLogoProps,
  type EndpointLogoPreset,
} from './components/atoms/EndpointLogo';
export {
  ModelLogo,
  modelLogoVariants,
  resolveModelLogoKey,
  type ModelLogoProps,
  type ModelLogoProvider,
} from './components/atoms/ModelLogo';
export { LoadingSpinner, type LoadingSpinnerProps } from './components/atoms/LoadingSpinner';
export { Tag, tagVariants, type TagProps } from './components/atoms/Tag';
export { InlineAlert, type InlineAlertProps } from './components/atoms/InlineAlert';
export { CommandSnippet, type CommandSnippetProps } from './components/atoms/CommandSnippet';
export { Textarea, type TextareaProps } from './components/atoms/Textarea';
export { Label, labelVariants, type LabelProps } from './components/atoms/Label';
export {
  Progress,
  progressVariants,
  progressIndicatorVariants,
  type ProgressProps,
} from './components/atoms/Progress';
export {
  Separator,
  separatorVariants,
  type SeparatorProps,
} from './components/atoms/Separator';
export { Rating, ratingVariants, type RatingProps } from './components/atoms/Rating';
export { Heading, headingVariants, type HeadingProps } from './components/atoms/Heading';
export { Text, textVariants, type TextProps } from './components/atoms/Text';
export { Link, linkVariants, type LinkProps } from './components/atoms/Link';
export { Markdown, type MarkdownProps } from './components/atoms/Markdown';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/atoms/Dialog';
export { Sheet, type SheetProps } from './components/atoms/Sheet';
export { Logo, type LogoProps } from './components/atoms/Logo';
export { AgreementRing, type AgreementRingProps, type AgreementLevel } from './components/atoms/AgreementRing';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/atoms/Select';

// Molecules (Level 2: Simple combinations of atoms)
export { ApiKeyInput, type ApiKeyInputProps, type Provider, type ValidationStatus } from './components/molecules/ApiKeyInput';
export { ModelCard, type ModelCardProps } from './components/molecules/ModelCard';
export { PromptInput, type PromptInputProps } from './components/molecules/PromptInput';
export { ResponseCard, PROVIDER_NAMES, type ResponseCardProps, type ResponseStatus, type ResponseType } from './components/molecules/ResponseCard';
export { ResponseErrorNotice, type ResponseErrorNoticeProps, type ResponseErrorKind } from './components/molecules/ResponseErrorNotice';
export { ModeSelectionCard, type ModeSelectionCardProps, type Mode } from './components/molecules/ModeSelectionCard';
export { EnsembleHeader } from './components/molecules/EnsembleHeader';
export { Footer, type FooterProps } from './components/molecules/Footer';
export {
  EmbeddingsProviderSelector,
  type EmbeddingsProviderSelectorProps,
  type EmbeddingsProviderId,
  type EmbeddingsProviderValue,
} from './components/molecules/EmbeddingsProviderSelector';
export {
  EndpointInput,
  type EndpointInputProps,
  type EndpointInputValue,
  type EndpointField,
  type EndpointValidationStatus,
  type EndpointErrorCode,
} from './components/molecules/EndpointInput';
export {
  EndpointEmbeddingField,
  type EndpointEmbeddingFieldProps,
} from './components/molecules/EndpointEmbeddingField';
export {
  LocalServerHelp,
  type LocalServerHelpProps,
  type LocalServerHelpReason,
} from './components/molecules/LocalServerHelp';
export {
  OllamaDetectedNotice,
  type OllamaDetectedNoticeProps,
  type OllamaNoticeState,
} from './components/molecules/OllamaDetectedNotice';
export {
  ConsensusPresetSelector,
  type ConsensusPresetSelectorProps,
} from './components/molecules/ConsensusPresetSelector';
export {
  ProgressSteps,
  type Step,
  type ProgressStepsProps,
} from './components/molecules/ProgressSteps';
export { SummarizerIndicator, type SummarizerIndicatorProps } from './components/molecules/SummarizerIndicator';
export {
  RunCostSummary,
  formatUsd,
  type RunCostSummaryProps,
  type RunCostCalls,
} from './components/molecules/RunCostSummary';
export {
  MajorityVoteBreakdown,
  type MajorityVoteBreakdownProps,
  type MajorityVoteOption,
  type MajorityVoteOutcome,
} from './components/molecules/MajorityVoteBreakdown';
export { AccuracyInterval, type AccuracyIntervalProps } from './components/molecules/AccuracyInterval';
export {
  BenchmarksNotRun,
  type BenchmarksNotRunProps,
  type BenchmarkRunEstimate,
} from './components/molecules/BenchmarksNotRun';

export { ModelChip, type ModelChipProps } from './components/molecules/ModelChip';
export { ModelPicker, type ModelPickerProps, type ModelPickerOption } from './components/molecules/ModelPicker';
export { MethodMenu, methodCostLabel, type MethodMenuProps, type SummarizerOption } from './components/molecules/MethodMenu';
export { AccountMenu, initialsOf, type AccountMenuProps, type AccountStatus, type AccountUser } from './components/molecules/AccountMenu';
export { SignInPanel, type SignInPanelProps, type SignInError } from './components/molecules/SignInPanel';
export { ShareDialog, type ShareDialogProps, type ShareDialogStatus, type ShareDialogError } from './components/molecules/ShareDialog';
export {
  CreditNotice,
  type CreditNoticeProps,
  type CreditNoticeVariant,
  type CreditPackOption,
} from './components/molecules/CreditNotice';
export { CreditPackButtons, type CreditPackButtonsProps } from './components/molecules/CreditPackButtons';
export { CreditBalanceCard, type CreditBalanceCardProps, type CreditBalanceState } from './components/molecules/CreditBalanceCard';
export {
  AccountSection,
  type AccountSectionProps,
  type AccountListProps,
  type AccountListStatus,
} from './components/molecules/AccountSection';
export { PurchaseHistory, type PurchaseHistoryProps, type PurchaseHistoryItem } from './components/molecules/PurchaseHistory';
export { ModelUsageList, type ModelUsageListProps, type ModelUsageItem } from './components/molecules/ModelUsageList';
export { RunHistory, type RunHistoryProps, type RunHistoryItem } from './components/molecules/RunHistory';
export { ModeSwitch, type ModeSwitchProps, type WorkspaceMode } from './components/molecules/ModeSwitch';
export { AppearanceSettings, type AppearanceSettingsProps, type AppearanceTheme, type AppearanceLanguage } from './components/molecules/AppearanceSettings';
export { ComposerOptions, type ComposerOptionsProps } from './components/molecules/ComposerOptions';
export { ComposerSubmit, type ComposerSubmitProps } from './components/molecules/ComposerSubmit';
export { AnswerCard, type AnswerCardProps, type AnswerStatus } from './components/molecules/AnswerCard';
export {
  AgreementSummary,
  agreementLevel,
  type AgreementSummaryProps,
  type AgreementPair,
  type AgreementUnavailableReason,
} from './components/molecules/AgreementSummary';
export {
  ConsensusAnswer,
  type ConsensusAnswerProps,
  type ConsensusAnswerStatus,
} from './components/molecules/ConsensusAnswer';

// Organisms (Level 3: Complex UI sections)
export { Composer, type ComposerProps, type ComposerModel, type ComposerManualResponse } from './components/organisms/Composer';
export { AnswerColumns, type AnswerColumnsProps, type AnswerColumnItem } from './components/organisms/AnswerColumns';
export { ConsensusPanel, type ConsensusPanelProps } from './components/organisms/ConsensusPanel';
export { SharedRun, type SharedRunProps } from './components/organisms/SharedRun';
export { AppShell, type AppShellProps } from './components/organisms/AppShell';
export { AccountDashboard, type AccountDashboardProps } from './components/organisms/AccountDashboard';
export {
  HistorySidebar,
  type HistorySidebarProps,
  type HistoryItem,
  type HistoryPreset,
} from './components/organisms/HistorySidebar';
export { ModeSelector, type ModeSelectorProps, type Mode as ModeType } from './components/organisms/ModeSelector';
export {
  EndpointConfiguration,
  type EndpointConfigurationProps,
  type EndpointPresetOption,
} from './components/organisms/EndpointConfiguration';
export { ApiKeyConfiguration, type ApiKeyConfigurationProps, type ApiKeyConfigurationItem } from './components/organisms/ApiKeyConfiguration';
export { EnsembleConfigurationSummary, type EnsembleConfigurationSummaryProps } from './components/organisms/EnsembleConfigurationSummary';
export { ConsensusCard, type ConsensusCardProps, type ConsensusStatus } from './components/organisms/ConsensusCard';
export { SettingsModal, type SettingsModalProps, type Theme, type Language } from './components/organisms/SettingsModal';
export { ManualResponseModal, type ManualResponseModalProps, type ManualResponseData } from './components/organisms/ManualResponseModal';
export { PromptTips, type PromptTipsProps } from './components/organisms/PromptTips';
export { PromptInputWithHint, type PromptInputWithHintProps } from './components/organisms/PromptInputWithHint';
export { PromptCard, type PromptCardProps } from './components/organisms/PromptCard';
export {
  BenchmarkResultsTable,
  type BenchmarkResultsTableProps,
  type BenchmarkResultRow,
} from './components/organisms/BenchmarkResultsTable';
export {
  BenchmarkMethod,
  type BenchmarkMethodProps,
  type BenchmarkMethodModel,
} from './components/organisms/BenchmarkMethod';
export { WaysIn, type WaysInProps } from './components/molecules/WaysIn';
export { ScoreGuide, type ScoreGuideProps } from './components/molecules/ScoreGuide';
export { HowItWorks, type HowItWorksProps } from './components/molecules/HowItWorks';
export { OnboardingKeyField, ONBOARDING_KEY_PROVIDERS, type OnboardingKeyFieldProps, type OnboardingKeyProvider, type OnboardingKeyStatus } from './components/molecules/OnboardingKeyField';
export { ExampleRun, type ExampleRunProps, type ExampleRunAnswer } from './components/organisms/ExampleRun';
export { OnboardingSheet, type OnboardingSheetProps, type OnboardingPath, type OnboardingLocalProps, type OnboardingProProps } from './components/organisms/OnboardingSheet';
export { PageIntro, type PageIntroProps } from './components/molecules/PageIntro';
export { FeatureGrid, type FeatureGridProps, type FeatureGridItem } from './components/molecules/FeatureGrid';
