import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from "discord.js";
import {generateId} from "./utils";

export class StringSelectMenuMultiplePagesBuilder extends StringSelectMenuBuilder {
    private _currentPage: number = 0;
    private _allOptions: { value: string; label: string; description?: string; default?: boolean }[] = [];
    private _chunkSize: number = 25;
    private _id: string;
    constructor() {
        super();
        this._id = generateId();
    }
    setRealOptions(options: { value: string; label: string; description?: string; default?: boolean }[]): this {
        this._allOptions = options;
        this._updateOptions();
        return this;
    }

    addRealOptions(...options): this {
        this._allOptions.push(...options);
        this._updateOptions();
        return this;
    }

    setChunkSize(size: number): this {
        this._chunkSize = Math.max(1, Math.min(size, 25)); // Ensure chunk size is between 1 and 25
        this._updateOptions();
        return this;
    }

    get currentPage(): number {
        return Math.min(this._currentPage, this.totalPages - 1);
    }

    get totalPages(): number {
        if(this._allOptions.length <= this._chunkSize) {
            return 1
        }
        return Math.ceil(this._allOptions.length / (this._chunkSize - 2));
    }

    nextPage(): this {
        if (this._currentPage < this.totalPages - 1) {
            this._currentPage++;
            this._updateOptions();
        }
        return this;
    }

    previousPage(): this {
        if (this._currentPage > 0) {
            this._currentPage--;
            this._updateOptions();
        }
        return this;
    }

    goToPage(page: number): this {
        const targetPage = Math.max(0, Math.min(page, this.totalPages - 1));
        if (targetPage !== this._currentPage) {
            this._currentPage = targetPage;
            this._updateOptions();
        }
        return this;
    }


    private _updateOptions(): void {
        // Clear existing options
        this.spliceOptions(0, this.options.length);

        // Get the current page's options
        const startIdx = this._currentPage * this._chunkSize;
        const endIdx = startIdx + this._chunkSize - 2;
        const pageOptions = this._allOptions.slice(startIdx, endIdx);
        const options = []
        // Add page navigation options if needed
        if (this.totalPages > 1) {
            if(this._currentPage > 0) {
                // Add previous page option
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Previous Page')
                        .setValue(`${this._id}__prev_page__`)
                )
            }
            options.push(...pageOptions)
            if(this.currentPage < this.totalPages - 1) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Next Page')
                        .setValue(`${this._id}__next_page__`)
                )
            }
        }

        this.setOptions(...options)
    }

    // Helper method to handle interaction and return the selected value or page change
    async handleInteraction(interaction): Promise<string | null> {
        if (interaction.componentType !== ComponentType.StringSelect) {
            return
        }

        const selectedValue = interaction.values[0];
        // Handle page navigation
        if (selectedValue === `${this._id}__prev_page__`) {
            this.previousPage();
            return null
        } else if (selectedValue === `${this._id}__next_page__`) {
            this.nextPage();
            return null
        }

        // Return the selected value and an update function
        return selectedValue
    }
}