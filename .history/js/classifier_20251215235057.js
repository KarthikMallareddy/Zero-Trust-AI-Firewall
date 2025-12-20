/**
 * Classifier - Content categorization system
 * Maps ImageNet predictions to content categories (NSFW, Violence, Weapons, Gore, etc.)
 */

class Classifier {
    constructor(categoryMappingJson) {
        this.categoryConfig = categoryMappingJson;
        this.categories = categoryMappingJson.categories;
        this.categoryIndex = this._buildCategoryIndex();
    }

    /**
     * Build reverse index: ImageNet class index → Category
     */
    _buildCategoryIndex() {
        const index = new Map();
        
        for (const [categoryId, categoryData] of Object.entries(this.categories)) {
            for (const classIndex of categoryData.imagenet_classes) {
                if (!index.has(classIndex)) {
                    index.set(classIndex, []);
                }
                index.get(classIndex).push(categoryId);
            }
        }
        
        return index;
    }

    /**
     * Classify an ImageNet prediction
     * @param {number} classIndex - ImageNet class index (0-999)
     * @param {number} confidence - Confidence score (0-1)
     * @returns {Object} Classification result with categories and confidence
     */
    classify(classIndex, confidence) {
        const matchedCategories = this.categoryIndex.get(classIndex) || [];
        
        return {
            class_index: classIndex,
            confidence: confidence,
            matched_categories: matchedCategories,
            is_flagged: matchedCategories.length > 0,
            primary_category: matchedCategories[0] || null,
            all_categories: matchedCategories
        };
    }

    /**
     * Determine if content should be blocked based on classification
     * @param {Object} classification - Result from classify()
     * @param {Object} settings - User settings with enabled categories and thresholds
     * @returns {Object} Blocking decision with reason
     */
    shouldBlock(classification, settings) {
        if (!classification.is_flagged) {
            return {
                should_block: false,
                reason: 'Not matched to any content category',
                blocked_categories: []
            };
        }

        const blockedCategories = [];
        let shouldBlock = false;

        for (const categoryId of classification.matched_categories) {
            const categoryEnabled = settings?.categories?.[categoryId] ?? 
                                   this.categories[categoryId]?.enabled_by_default ?? true;
            
            if (!categoryEnabled) continue;

            const threshold = settings?.category_thresholds?.[categoryId] ?? 
                            this.categories[categoryId]?.confidence_threshold ?? 
                            settings?.confidence_threshold ?? 0.70;

            if (classification.confidence >= threshold) {
                blockedCategories.push({
                    category: categoryId,
                    label: this.categories[categoryId]?.label,
                    confidence: classification.confidence,
                    threshold: threshold
                });
                shouldBlock = true;
            }
        }

        return {
            should_block: shouldBlock,
            reason: shouldBlock 
                ? `Content matched: ${blockedCategories.map(c => c.category).join(', ')}`
                : 'Confidence below threshold',
            blocked_categories: blockedCategories,
            confidence: classification.confidence
        };
    }

    /**
     * Get category info by ID
     */
    getCategoryInfo(categoryId) {
        return this.categories[categoryId] || null;
    }

    /**
     * Get all categories
     */
    getAllCategories() {
        return Object.entries(this.categories).map(([id, data]) => ({
            id,
            ...data
        }));
    }

    /**
     * Get enabled categories for profile
     */
    getProfileSettings(profileName) {
        return this.categoryConfig.profiles[profileName]?.settings || null;
    }

    /**
     * Validate settings object
     */
    validateSettings(settings) {
        const errors = [];

        if (settings.confidence_threshold !== undefined) {
            if (typeof settings.confidence_threshold !== 'number' || 
                settings.confidence_threshold < 0 || 
                settings.confidence_threshold > 1) {
                errors.push('confidence_threshold must be between 0 and 1');
            }
        }

        if (settings.categories) {
            const validCategories = Object.keys(this.categories);
            for (const [cat, enabled] of Object.entries(settings.categories)) {
                if (!validCategories.includes(cat)) {
                    errors.push(`Unknown category: ${cat}`);
                }
                if (typeof enabled !== 'boolean') {
                    errors.push(`Category ${cat} must be boolean`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get classification summary for logging
     */
    getSummary(classification, blockingDecision) {
        return {
            timestamp: new Date().toISOString(),
            class_index: classification.class_index,
            confidence: (classification.confidence * 100).toFixed(2) + '%',
            matched_categories: classification.matched_categories,
            blocked: blockingDecision.should_block,
            reason: blockingDecision.reason
        };
    }
}

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Classifier;
}
