import { theme } from '../../../lib/theme';

/**
 * Generates accessible button attributes
 */
export const getButtonA11yProps = (options: {
    label: string;
    disabled?: boolean;
    pressed?: boolean;
    expanded?: boolean;
    controls?: string;
    describedBy?: string;
}) => {
    const props: Record<string, string | boolean | number> = {
        'aria-label': options.label,
        'role': 'button',
        'tabIndex': options.disabled ? -1 : 0,
    };

    if (options.disabled !== undefined) {
        props['aria-disabled'] = options.disabled;
    }

    if (options.pressed !== undefined) {
        props['aria-pressed'] = options.pressed;
    }

    if (options.expanded !== undefined) {
        props['aria-expanded'] = options.expanded;
    }

    if (options.controls) {
        props['aria-controls'] = options.controls;
    }

    if (options.describedBy) {
        props['aria-describedby'] = options.describedBy;
    }

    return props;
};

/**
 * Generates accessible input attributes
 */
export const getInputA11yProps = (options: {
    label: string;
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
    errorId?: string;
}) => {
    const props: Record<string, string | boolean> = {
        'aria-label': options.label,
    };

    if (options.required) {
        props['aria-required'] = true;
        props['required'] = true;
    }

    if (options.invalid) {
        props['aria-invalid'] = true;
    }

    if (options.errorId && options.invalid) {
        props['aria-describedby'] = options.errorId;
    } else if (options.describedBy) {
        props['aria-describedby'] = options.describedBy;
    }

    return props;
};

/**
 * Generates accessible table attributes
 */
export const getTableA11yProps = (caption: string) => {
    return {
        'role': 'table',
        'aria-label': caption,
    };
};

/**
 * Generates accessible modal/dialog attributes
 */
export const getDialogA11yProps = (options: {
    label: string;
    describedBy?: string;
    modal?: boolean;
}) => {
    const props: Record<string, string | boolean> = {
        'role': 'dialog',
        'aria-label': options.label,
        'aria-modal': options.modal !== false,
    };

    if (options.describedBy) {
        props['aria-describedby'] = options.describedBy;
    }

    return props;
};

/**
 * Generates accessible alert attributes
 */
export const getAlertA11yProps = (options: {
    type?: 'error' | 'warning' | 'success' | 'info';
    live?: 'polite' | 'assertive';
}) => {
    return {
        'role': options.type === 'error' ? 'alert' : 'status',
        'aria-live': options.live || (options.type === 'error' ? 'assertive' : 'polite'),
        'aria-atomic': 'true',
    };
};

/**
 * Generates focus styles for keyboard navigation
 */
export const getFocusStyles = (options?: {
    color?: string;
    offset?: number;
    width?: number;
}) => {
    const color = options?.color || theme.colors.accent;
    const offset = options?.offset !== undefined ? options.offset : 2;
    const width = options?.width || 2;

    return {
        outline: `${width}px solid ${color}`,
        outlineOffset: `${offset}px`,
        transition: 'outline 0.2s ease, outline-offset 0.2s ease',
    };
};

/**
 * Generates visible focus ring styles (always visible, not just on keyboard)
 */
export const getVisibleFocusStyles = () => {
    return {
        ':focus': getFocusStyles(),
        ':focus-visible': getFocusStyles(),
    };
};

/**
 * Skip link styles (for screen reader users to skip navigation)
 */
export const getSkipLinkStyles = () => {
    return {
        position: 'absolute' as const,
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        ':focus': {
            position: 'static' as const,
            width: 'auto',
            height: 'auto',
            overflow: 'visible',
            padding: '12px 16px',
            background: theme.colors.accent,
            color: 'white',
            borderRadius: theme.radii.md,
            zIndex: 9999,
        },
    };
};

/**
 * Screen reader only styles (visually hidden but accessible)
 */
export const getScreenReaderOnlyStyles = () => {
    return {
        position: 'absolute' as const,
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap' as const,
    };
};

/**
 * Generates loading state announcement
 */
export const getLoadingA11yProps = (label: string) => {
    return {
        'role': 'status',
        'aria-live': 'polite',
        'aria-label': label,
        'aria-busy': true,
    };
};

/**
 * Generates list attributes for proper semantic structure
 */
export const getListA11yProps = (options: {
    label?: string;
    itemCount?: number;
}) => {
    const props: Record<string, string | number> = {
        'role': 'list',
    };

    if (options.label) {
        props['aria-label'] = options.label;
    }

    if (options.itemCount !== undefined) {
        props['aria-setsize'] = options.itemCount;
    }

    return props;
};

/**
 * Generates list item attributes
 */
export const getListItemA11yProps = (options: {
    position?: number;
    setSize?: number;
}) => {
    const props: Record<string, string | number> = {
        'role': 'listitem',
    };

    if (options.position !== undefined) {
        props['aria-posinset'] = options.position;
    }

    if (options.setSize !== undefined) {
        props['aria-setsize'] = options.setSize;
    }

    return props;
};

/**
 * Utility to format number for screen readers
 */
export const formatNumberForA11y = (value: number, options?: {
    prefix?: string;
    suffix?: string;
    decimals?: number;
}): string => {
    const formatted = options?.decimals !== undefined
        ? value.toFixed(options.decimals)
        : value.toString();

    const prefix = options?.prefix || '';
    const suffix = options?.suffix || '';

    return `${prefix}${formatted}${suffix}`;
};

/**
 * Generates progress bar accessibility attributes
 */
export const getProgressA11yProps = (options: {
    value: number;
    max?: number;
    label: string;
}) => {
    return {
        'role': 'progressbar',
        'aria-valuenow': options.value,
        'aria-valuemin': 0,
        'aria-valuemax': options.max || 100,
        'aria-label': options.label,
    };
};

/**
 * Generates tooltip/hint accessibility attributes
 */
export const getTooltipA11yProps = (tooltipId: string, visible: boolean) => {
    return {
        'aria-describedby': visible ? tooltipId : undefined,
        'aria-expanded': visible,
    };
};

/**
 * Announce status change for screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
        if (document.body.contains(announcement)) {
            document.body.removeChild(announcement);
        }
    }, 1000);
};
