import { useState, useCallback } from 'react';

export interface ValidationRule<T = any> {
    validate: (value: T, formData?: any) => boolean | Promise<boolean>;
    message: string;
}

export interface FieldValidation {
    [fieldName: string]: ValidationRule[];
}

export interface ValidationErrors {
    [fieldName: string]: string | null;
}

export const useFormValidation = <T extends Record<string, any>>(
    validationRules: FieldValidation
) => {
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const validateField = useCallback(async (
        fieldName: string,
        value: any,
        formData?: T
    ): Promise<string | null> => {
        const rules = validationRules[fieldName];
        if (!rules) return null;

        for (const rule of rules) {
            const isValid = await rule.validate(value, formData);
            if (!isValid) {
                return rule.message;
            }
        }

        return null;
    }, [validationRules]);

    const validateForm = useCallback(async (formData: T): Promise<boolean> => {
        const newErrors: ValidationErrors = {};
        let isValid = true;

        for (const fieldName in validationRules) {
            const error = await validateField(fieldName, formData[fieldName], formData);
            newErrors[fieldName] = error;
            if (error) {
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    }, [validationRules, validateField]);

    const validateFieldOnBlur = useCallback(async (
        fieldName: string,
        value: any,
        formData?: T
    ) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
        const error = await validateField(fieldName, value, formData);
        setErrors(prev => ({ ...prev, [fieldName]: error }));
    }, [validateField]);

    const clearError = useCallback((fieldName: string) => {
        setErrors(prev => ({ ...prev, [fieldName]: null }));
    }, []);

    const clearAllErrors = useCallback(() => {
        setErrors({});
        setTouched({});
    }, []);

    const markFieldTouched = useCallback((fieldName: string) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
    }, []);

    return {
        errors,
        touched,
        validateField,
        validateForm,
        validateFieldOnBlur,
        clearError,
        clearAllErrors,
        markFieldTouched,
        hasErrors: Object.values(errors).some(error => error !== null),
        getFieldError: (fieldName: string) => (touched[fieldName] ? errors[fieldName] : null) ?? undefined
    };
};

// Common validation rules
export const required = (message: string = 'This field is required'): ValidationRule => ({
    validate: (value) => {
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        return value != null && value !== '';
    },
    message
});

export const minLength = (length: number, message?: string): ValidationRule => ({
    validate: (value) => {
        if (typeof value !== 'string') return true;
        return value.length >= length;
    },
    message: message || `Must be at least ${length} characters`
});

export const maxLength = (length: number, message?: string): ValidationRule => ({
    validate: (value) => {
        if (typeof value !== 'string') return true;
        return value.length <= length;
    },
    message: message || `Must be at most ${length} characters`
});

export const email = (message: string = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value) => {
        if (typeof value !== 'string' || value.trim() === '') return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    },
    message
});

export const pattern = (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => {
        if (typeof value !== 'string' || value.trim() === '') return true;
        return regex.test(value);
    },
    message
});

export const numeric = (message: string = 'Please enter a valid number'): ValidationRule => ({
    validate: (value) => {
        if (value === '' || value == null) return true;
        return !isNaN(Number(value));
    },
    message
});

export const min = (minimum: number, message?: string): ValidationRule => ({
    validate: (value) => {
        if (value === '' || value == null) return true;
        const num = Number(value);
        return !isNaN(num) && num >= minimum;
    },
    message: message || `Must be at least ${minimum}`
});

export const max = (maximum: number, message?: string): ValidationRule => ({
    validate: (value) => {
        if (value === '' || value == null) return true;
        const num = Number(value);
        return !isNaN(num) && num <= maximum;
    },
    message: message || `Must be at most ${maximum}`
});

export const custom = (
    validateFn: (value: any, formData?: any) => boolean | Promise<boolean>,
    message: string
): ValidationRule => ({
    validate: validateFn,
    message
});
