// ============================================================================
// SmartQuote v3 - Pricing Rules Service
// ============================================================================

import { supabase } from '../../../lib/supabaseClient';
import {
    PricingRule,
    PricingRuleType,
    PricingRuleApplication,
    Quote,
    CalculatedProduct,
} from '../types';

class PricingRulesService {
    /**
     * Apply all applicable pricing rules to a quote
     */
    async applyPricingRules(quote: Quote): Promise<{
        originalAmount: number;
        finalAmount: number;
        appliedRules: PricingRuleApplication[];
        discountAmount: number;
        discountPercent: number;
    }> {
        try {
            const rules = await this.getApplicableRules(quote);
            const appliedRules: PricingRuleApplication[] = [];
            let currentAmount = quote.total_amount;
            const originalAmount = quote.total_amount;

            // Sort by priority (lower = higher priority)
            rules.sort((a, b) => a.priority - b.priority);

            for (const rule of rules) {
                // Check if we've hit usage limit
                if (rule.maxUses && rule.currentUses >= rule.maxUses) {
                    continue;
                }

                // Check if rule is excluded by previously applied rules
                const appliedRuleIds = appliedRules.map((ar) => ar.ruleId);
                if (rule.excludesRuleIds?.some((id) => appliedRuleIds.includes(id))) {
                    continue;
                }

                // Calculate discount
                const discount = this.calculateDiscount(rule, currentAmount, quote);

                if (discount > 0) {
                    const application: PricingRuleApplication = {
                        id: '',
                        quoteId: quote.id,
                        ruleId: rule.id,
                        appliedTo: quote.products,
                        discountAmount: discount,
                        discountPercent: (discount / currentAmount) * 100,
                        originalAmount: currentAmount,
                        finalAmount: currentAmount - discount,
                        appliedAt: new Date(),
                    };

                    appliedRules.push(application);

                    // Update current amount if stackable, otherwise keep highest discount
                    if (rule.isStackable) {
                        currentAmount -= discount;
                    } else {
                        // Non-stackable: take the best discount
                        const totalDiscount = appliedRules.reduce(
                            (sum, ar) => sum + ar.discountAmount,
                            0
                        );
                        if (discount > totalDiscount) {
                            currentAmount = originalAmount - discount;
                            appliedRules.length = 0;
                            appliedRules.push(application);
                        }
                    }
                }
            }

            const finalAmount = currentAmount;
            const totalDiscount = originalAmount - finalAmount;
            const discountPercent = (totalDiscount / originalAmount) * 100;

            // Record applications in database
            if (appliedRules.length > 0) {
                await supabase.from('smartquote_v3_pricing_rule_applications').insert(
                    appliedRules.map((ar) => ({
                        quote_id: ar.quoteId,
                        rule_id: ar.ruleId,
                        applied_to: ar.appliedTo,
                        discount_amount: ar.discountAmount,
                        discount_percent: ar.discountPercent,
                        original_amount: ar.originalAmount,
                        final_amount: ar.finalAmount,
                    }))
                );

                // Update rule usage counts
                for (const rule of rules) {
                    if (appliedRules.some((ar) => ar.ruleId === rule.id)) {
                        await supabase
                            .from('smartquote_v3_pricing_rules')
                            .update({ current_uses: rule.currentUses + 1 })
                            .eq('id', rule.id);
                    }
                }
            }

            return {
                originalAmount,
                finalAmount,
                appliedRules,
                discountAmount: totalDiscount,
                discountPercent,
            };
        } catch (error) {
            console.error('Failed to apply pricing rules:', error);
            return {
                originalAmount: quote.total_amount,
                finalAmount: quote.total_amount,
                appliedRules: [],
                discountAmount: 0,
                discountPercent: 0,
            };
        }
    }

    /**
     * Get all applicable rules for a quote
     */
    async getApplicableRules(quote: Quote): Promise<PricingRule[]> {
        try {
            const now = new Date().toISOString();

            // Get active rules
            const { data: rules, error } = await supabase
                .from('smartquote_v3_pricing_rules')
                .select('*')
                .eq('is_active', true)
                .or(`active_from.is.null,active_from.lte.${now}`)
                .or(`active_until.is.null,active_until.gte.${now}`);

            if (error) throw error;

            // Filter rules that match quote conditions
            const applicableRules = (rules as PricingRule[]).filter((rule) =>
                this.matchesConditions(rule, quote)
            );

            return applicableRules;
        } catch (error) {
            console.error('Failed to get applicable rules:', error);
            return [];
        }
    }

    /**
     * Check if rule conditions match quote
     */
    private matchesConditions(rule: PricingRule, quote: Quote): boolean {
        const conditions = rule.conditions;

        // Check amount thresholds
        if (conditions.minTotal && quote.total_amount < conditions.minTotal) {
            return false;
        }
        if (conditions.maxTotal && quote.total_amount > conditions.maxTotal) {
            return false;
        }

        // Check client
        if (conditions.clientId && quote.clientId !== conditions.clientId) {
            return false;
        }

        // Check product categories/codes
        if (conditions.productCategory || conditions.productCodes) {
            const hasMatchingProduct = quote.products.some((product: any) => {
                if (
                    conditions.productCodes &&
                    !conditions.productCodes.includes(product.productCode)
                ) {
                    return false;
                }
                // Note: Would need product category in product data
                return true;
            });

            if (!hasMatchingProduct) {
                return false;
            }
        }

        // Check quantity
        if (conditions.minQuantity || conditions.maxQuantity) {
            const totalQuantity = quote.products.reduce((sum: number, p: any) => sum + p.quantity, 0);
            if (conditions.minQuantity && totalQuantity < conditions.minQuantity) {
                return false;
            }
            if (conditions.maxQuantity && totalQuantity > conditions.maxQuantity) {
                return false;
            }
        }

        // Check date range
        if (conditions.dateRange) {
            const now = new Date();
            const start = new Date(conditions.dateRange.start);
            const end = new Date(conditions.dateRange.end);
            if (now < start || now > end) {
                return false;
            }
        }

        // Check day of week
        if (conditions.dayOfWeek && conditions.dayOfWeek.length > 0) {
            const today = new Date().getDay();
            if (!conditions.dayOfWeek.includes(today)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate discount amount for a rule
     */
    private calculateDiscount(rule: PricingRule, amount: number, quote: Quote): number {
        const action = rule.action;

        if (action.discountPercent) {
            return (amount * action.discountPercent) / 100;
        }

        if (action.discountAmount) {
            return Math.min(action.discountAmount, amount);
        }

        if (action.fixedPrice) {
            return Math.max(0, amount - action.fixedPrice);
        }

        if (action.markupPercent) {
            // Negative discount (markup)
            return -(amount * action.markupPercent) / 100;
        }

        return 0;
    }

    /**
     * Create or update pricing rule
     */
    async savePricingRule(
        rule: Partial<PricingRule>
    ): Promise<{ success: boolean; data?: PricingRule; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            if (rule.id) {
                // Update existing
                const { data, error } = await supabase
                    .from('smartquote_v3_pricing_rules')
                    .update(rule)
                    .eq('id', rule.id)
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, data: data as PricingRule };
            } else {
                // Create new
                const { data, error } = await supabase
                    .from('smartquote_v3_pricing_rules')
                    .insert({ ...rule, created_by: userId })
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, data: data as PricingRule };
            }
        } catch (error) {
            console.error('Failed to save pricing rule:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save pricing rule',
            };
        }
    }

    /**
     * Get all pricing rules
     */
    async getPricingRules(activeOnly: boolean = true): Promise<PricingRule[]> {
        try {
            let query = supabase
                .from('smartquote_v3_pricing_rules')
                .select('*')
                .order('priority', { ascending: true });

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data as PricingRule[];
        } catch (error) {
            console.error('Failed to get pricing rules:', error);
            return [];
        }
    }

    /**
     * Delete pricing rule
     */
    async deletePricingRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('smartquote_v3_pricing_rules')
                .update({ is_active: false })
                .eq('id', ruleId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Failed to delete pricing rule:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete pricing rule',
            };
        }
    }

    /**
     * Get applied rules for a quote
     */
    async getAppliedRules(quoteId: string): Promise<PricingRuleApplication[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_pricing_rule_applications')
                .select('*')
                .eq('quote_id', quoteId)
                .order('applied_at', { ascending: false });

            if (error) throw error;

            return data as PricingRuleApplication[];
        } catch (error) {
            console.error('Failed to get applied rules:', error);
            return [];
        }
    }
}

export const pricingRulesService = new PricingRulesService();
