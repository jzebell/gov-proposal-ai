const axios = require('axios');

class RequirementExtractor {
    constructor(ollamaUrl = 'http://ollama:11434') {
        this.ollamaUrl = ollamaUrl;
        this.modelName = 'llama2'; // default model
    }

    async extractRequirements(documentText) {
        try {
            const requirements = {
                technical: await this.extractRequirementsByType(documentText, 'technical'),
                management: await this.extractRequirementsByType(documentText, 'management'),
                compliance: await this.extractRequirementsByType(documentText, 'compliance')
            };

            return requirements;
        } catch (error) {
            throw new Error(`Failed to extract requirements: ${error.message}`);
        }
    }

    async extractRequirementsByType(documentText, type) {
        const promptMap = {
            technical: "Analyze the following government solicitation text and extract all technical requirements. Format each requirement as a JSON object with 'id', 'description', and 'priority' fields:",
            management: "Analyze the following government solicitation text and extract all management requirements. Format each requirement as a JSON object with 'id', 'description', and 'priority' fields:",
            compliance: "Analyze the following government solicitation text and extract all compliance requirements. Format each requirement as a JSON object with 'id', 'description', and 'priority' fields:"
        };

        try {
            const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
                model: this.modelName,
                prompt: `${promptMap[type]}\n\n${documentText}`,
                stream: false
            });

            // Parse the response and convert to structured data
            const rawExtraction = response.data.response;
            return this.parseRequirements(rawExtraction);
        } catch (error) {
            throw new Error(`Failed to extract ${type} requirements: ${error.message}`);
        }
    }

    parseRequirements(rawText) {
        try {
            // Attempt to parse JSON directly if the response is well-formatted
            if (rawText.trim().startsWith('[')) {
                return JSON.parse(rawText);
            }

            // Fall back to regex-based extraction if JSON parsing fails
            const requirementRegex = /{[^}]+}/g;
            const matches = rawText.match(requirementRegex) || [];
            return matches.map(match => {
                try {
                    return JSON.parse(match);
                } catch (e) {
                    return null;
                }
            }).filter(req => req !== null);
        } catch (error) {
            throw new Error(`Failed to parse requirements: ${error.message}`);
        }
    }

    setModel(modelName) {
        this.modelName = modelName;
    }

    async checkOllamaConnection() {
        try {
            await axios.get(`${this.ollamaUrl}/api/tags`);
            return true;
        } catch (error) {
            throw new Error(`Failed to connect to Ollama: ${error.message}`);
        }
    }
}

module.exports = RequirementExtractor;