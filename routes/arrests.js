import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
import {
  getAllArrests,
  getSortedArrests,
  searchAndSortArrests,
  getArrestById,
  getArrestsByFilter,
  searchArrests,
  getCrimeRanking
} from "../data/arrests.js";
import commentsData from "../data/comments.js";
import { checkString, checkId } from "../data/utils.js";
import xss from "xss"; 
import { arrests } from "../config/mongoCollections.js";  


router.get("/", async (req, res) => {
  try {
    // Get page from query parameter, default to 1
    const page = req.query.page ? parseInt(req.query.page) : 1;
    
    // Validate page number
    if (page < 1) {
      return res.redirect("/arrests?page=1");
    }
    
    // Get paginated data
    const sortField = req.query.sortField || 'arrest_date';
    const sortOrder = req.query.sortOrder || 'desc';
    const data = await getSortedArrests(page, 50, sortField, sortOrder);
    
    // Check if page exceeds total pages
    if (page > data.totalPages && data.totalPages > 0) {
      return res.redirect(`/arrests?page=${data.totalPages}`);
    }
    
    return res.render("arrestList", {
      arrests: data.arrests,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      totalCount: data.totalCount,
      hasNextPage: data.hasNextPage,
      hasPrevPage: data.hasPrevPage,
      sortField: data.sortField,
      sortOrder: data.sortOrder
    });
  } catch (e) {
    return res.status(500).render("error", { error: e });
  }
});

router.get("/search", async (req, res) => {
  let { keyword } = req.query;

  if (!keyword) {
    return res.render("search", { showForm: true });
  }

  try {
    keyword = checkString(keyword, "keyword");
    keyword = xss(keyword);
    const sortField = req.query.sortField || 'arrest_date';
    const sortOrder = req.query.sortOrder || 'desc';
    const results = await searchAndSortArrests(keyword, sortField, sortOrder);
    return res.render("search", {
      showForm: true,
      results,
      keyword,
      sortField,
      sortOrder
    });
  } catch (e) {
    return res.render("search", { showForm: true, error: e });
  }
});

router.get("/filter", async (req, res) => {
  const filters = req.query;

  if (Object.keys(filters).length === 0) {
    return res.render("filter");
  }

  try {
    // XSS sanitization - MODIFIED
    const cleanFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value && typeof value === 'string') {
        cleanFilters[key] = xss(value.trim());
      } else if (value) {
        cleanFilters[key] = value;
      }
    }
    
    const results = await getArrestsByFilter(cleanFilters);
    
    // Build query string for export links - MODIFIED
    const queryString = new URLSearchParams(cleanFilters).toString();
    
    return res.render("filter", { 
      arrests: results,
      queryString: queryString
    });
  } catch (e) {
    return res.status(400).render("error", { error: e });
  }
});

// Crime Category Ranking - must be before /:id route
router.get("/ranking", requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const ranking = await getCrimeRanking(limit);

    const arrestCollection = await arrests();
    const totalRecords = await arrestCollection.countDocuments({});
    
    return res.render("crimeRanking", {
      title: "Crime Category Ranking",
      ranking: ranking,
      totalRecords: totalRecords 
    });
  } catch (e) {
    return res.status(500).render("error", { 
      error: String(e)
    });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = checkId(req.params.id, "id");
    const arrest = await getArrestById(id);
    return res.render("arrestDetails", { arrest, user: req.session.user || null });
  } catch (e) {
    return res.status(404).render("error", { error: e });
  }
});

router.get("/:id/comments", requireAuth, async (req, res) => {
  try {
    const id = checkId(req.params.id);
    const comments = await commentsData.getCommentsByArrestId(id);
    return res.json(comments);
  } catch (e) {
    return res.status(400).json({ error: e });
  }
});

// Export filtered results to CSV
router.get("/filter/export/csv", requireAuth, async (req, res) => {
  try {
    const filters = req.query;
    
    // XSS sanitization - MODIFIED
    const cleanFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value && typeof value === 'string') {
        cleanFilters[key] = xss(value.trim());
      } else if (value) {
        cleanFilters[key] = value;
      }
    }
    
    // Get filtered results - MODIFIED
    const results = await getArrestsByFilter(cleanFilters);
    
    if (results.length === 0) {
      return res.status(400).send("No results to export");
    }
    
    // Generate CSV header
    let csv = "Arrest ID,Date,Borough,Precinct,Offense,Law Category,Age Group,Gender,Race,Latitude,Longitude\n";
    
    // Add data rows
    results.forEach(arrest => {
      const row = [
        arrest._id,
        arrest.arrest_date,
        arrest.borough,
        arrest.precinct,
        `"${arrest.offense_description}"`,
        arrest.law_category,
        arrest.age_group || "N/A",
        arrest.gender,
        arrest.race,
        arrest.arrest_location?.latitude || "N/A",
        arrest.arrest_location?.longitude || "N/A"
      ].join(",");
      csv += row + "\n";
    });
    
    // Set download headers
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="filtered-arrests-${date}.csv"`);
    
    return res.send(csv);
  } catch (e) {
    console.error('CSV Export Error:', e);
    return res.status(500).send(`Error generating CSV: ${e.message || e}`);
  }
});

// Export filtered results to PDF
router.get("/filter/export/pdf", requireAuth, async (req, res) => {
  try {
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const filters = req.query;
    
    // XSS sanitization - MODIFIED
    const cleanFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value && typeof value === 'string') {
        cleanFilters[key] = xss(value.trim());
      } else if (value) {
        cleanFilters[key] = value;
      }
    }
    
    // Get filtered results - MODIFIED
    const results = await getArrestsByFilter(cleanFilters);
    
    if (results.length === 0) {
      return res.status(400).send("No results to export");
    }
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add first page
    let page = pdfDoc.addPage([595, 842]); // A4 size
    let { width, height } = page.getSize();
    let yPosition = height - 50;
    
    // Title
    page.drawText('NYC Arrest Records - Filtered Results', {
      x: 50,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= 40;
    
    // Date and count
    const date = new Date().toISOString().split('T')[0];
    page.drawText(`Report Date: ${date}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font
    });
    yPosition -= 20;
    
    page.drawText(`Total Records: ${results.length}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: font
    });
    yPosition -= 40;
    
    // Filter criteria section
    page.drawText('Filter Criteria:', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont
    });
    yPosition -= 20;
    
    // MODIFIED - use cleanFilters
    if (cleanFilters.borough) {
      page.drawText(`Borough: ${cleanFilters.borough}`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: font
      });
      yPosition -= 15;
    }
    
    if (cleanFilters.precinct) {
      page.drawText(`Precinct: ${cleanFilters.precinct}`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: font
      });
      yPosition -= 15;
    }
    
    if (cleanFilters.age_group) {
      page.drawText(`Age Group: ${cleanFilters.age_group}`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: font
      });
      yPosition -= 15;
    }
    
    if (cleanFilters.gender) {
      page.drawText(`Gender: ${cleanFilters.gender}`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: font
      });
      yPosition -= 15;
    }
    
    if (cleanFilters.race) {
      page.drawText(`Race: ${cleanFilters.race}`, {
        x: 60,
        y: yPosition,
        size: 10,
        font: font
      });
      yPosition -= 15;
    }
    
    yPosition -= 20;
    
    // Results header
    page.drawText('Results (First 50):', {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont
    });
    yPosition -= 25;
    
    // Add results
    const limit = Math.min(results.length, 50);
    for (let i = 0; i < limit; i++) {
      const arrest = results[i];
      
      // Check if need new page
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      // Offense (bold, truncate if too long)
      const offenseText = `${i + 1}. ${arrest.offense_description}`;
      const displayText = offenseText.length > 80 ? offenseText.substring(0, 77) + '...' : offenseText;
      page.drawText(displayText, {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont
      });
      yPosition -= 15;
      
      // Details line 1
      const details1 = `   Date: ${arrest.arrest_date} | Borough: ${arrest.borough} | Precinct: ${arrest.precinct}`;
      page.drawText(details1, {
        x: 50,
        y: yPosition,
        size: 9,
        font: font
      });
      yPosition -= 12;
      
      // Details line 2
      const details2 = `   Category: ${arrest.law_category} | Age: ${arrest.age_group || 'N/A'} | Gender: ${arrest.gender} | Race: ${arrest.race}`;
      page.drawText(details2.substring(0, 85), {
        x: 50,
        y: yPosition,
        size: 9,
        font: font
      });
      yPosition -= 20;
    }
    
    // Add note if more records exist
    if (results.length > 50) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      page.drawText(`... and ${results.length - 50} more records`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5)
      });
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    
    // Send as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="filtered-arrests-${date}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
    
  } catch (e) {
    console.error('PDF Export Error:', e);
    return res.status(500).send(`Error generating PDF: ${e.message || e}`);
  }
});

export default router;