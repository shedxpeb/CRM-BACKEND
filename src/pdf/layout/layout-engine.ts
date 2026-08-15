import { PdfEngine } from '../engine/pdf-engine';
import { PAGE } from '../helpers/colors';

export interface SectionDimensions {
  height: number;
  minHeight: number;
  preferredHeight: number;
  maxHeight: number;
}

export interface PageLayout {
  header: SectionDimensions;
  orderInfo: SectionDimensions;
  address: SectionDimensions;
  table: SectionDimensions;
  summary: SectionDimensions;
  amountInWords: SectionDimensions;
  terms: SectionDimensions;
  signatures: SectionDimensions;
  footer: SectionDimensions;
}

export interface LayoutPlan {
  totalPages: number;
  page1: {
    header: boolean;
    orderInfo: boolean;
    address: boolean;
    tableRows: number;
    summary: boolean;
    amountInWords: boolean;
    terms: boolean;
    signatures: boolean;
    footer: boolean;
  };
  continuationPages: {
    tableRows: number;
  }[];
}

export class LayoutCalculator {
  private engine: PdfEngine;

  constructor(engine: PdfEngine) {
    this.engine = engine;
  }

  calculateLayout(layout: PageLayout, totalTableRows: number, rowHeights: number[]): LayoutPlan {
    const margin = this.engine.getMargin();
    const pageHeight = PAGE.height;
    const availableHeight = pageHeight - margin.top - margin.bottom;

    const fixedHeight =
      layout.header.preferredHeight +
      layout.orderInfo.preferredHeight +
      layout.address.preferredHeight +
      layout.summary.preferredHeight +
      layout.amountInWords.preferredHeight +
      layout.terms.preferredHeight +
      layout.signatures.preferredHeight +
      layout.footer.preferredHeight;

    const tableAvailableOnPage1 = availableHeight - fixedHeight - 20; // 20pt buffer

    let page1TableRows = 0;
    let page1TableHeight = layout.table.preferredHeight;

    for (let i = 0; i < totalTableRows; i++) {
      if (page1TableHeight + rowHeights[i] <= tableAvailableOnPage1) {
        page1TableHeight += rowHeights[i];
        page1TableRows++;
      } else {
        break;
      }
    }

    const remainingRows = totalTableRows - page1TableRows;
    const totalPages = remainingRows > 0 ? 2 : 1;

    const continuationPages: { tableRows: number }[] = [];
    if (remainingRows > 0) {
      const contPageAvailable = availableHeight - 40; // Header + page number
      let rowsOnPage = 0;
      let height = 0;
      for (let i = page1TableRows; i < totalTableRows; i++) {
        if (height + rowHeights[i] <= contPageAvailable) {
          height += rowHeights[i];
          rowsOnPage++;
        } else {
          continuationPages.push({ tableRows: rowsOnPage });
          rowsOnPage = 0;
          height = 0;
          i--;
        }
      }
      if (rowsOnPage > 0) {
        continuationPages.push({ tableRows: rowsOnPage });
      }
    }

    return {
      totalPages: totalPages + continuationPages.length,
      page1: {
        header: true,
        orderInfo: true,
        address: true,
        tableRows: page1TableRows,
        summary: true,
        amountInWords: true,
        terms: true,
        signatures: true,
        footer: true,
      },
      continuationPages,
    };
  }

  getAvailableHeight(): number {
    const margin = this.engine.getMargin();
    return PAGE.height - margin.top - margin.bottom;
  }
}
