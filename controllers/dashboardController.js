import PDFDocument from "pdfkit";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";

import Order from "../models/order.js";

// export const salesreportget = async (req, res) => {
//     try {
//         const { filter, startDate, endDate, format, month, year } = req.query;

//         if (!format) {
//             return res.status(400).json({ message: "Format parameter is required" });
//         }

//         const fileFormat = format.toLowerCase();
//         if (!["excel", "pdf", "json"].includes(fileFormat)) {
//             return res.status(400).json({ message: "Invalid format specified. Use excel, pdf, or json" });
//         }

//         let matchCondition = { status: "Delivered" };
//         const now = new Date();
//         let startOfWeek, endOfWeek;

//         // Filter logic
//         if (filter === "daily") {
//             matchCondition.createdAt = {
//                 $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
//                 $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
//             };
//         } else if (filter === "weekly") {
//             startOfWeek = new Date(now);
//             startOfWeek.setDate(now.getDate() - ((now.getDay() + 1) % 7)); // Previous Saturday
//             startOfWeek.setHours(0, 0, 0, 0);
//             endOfWeek = new Date(startOfWeek);
//             endOfWeek.setDate(startOfWeek.getDate() + 6); // Following Friday
//             endOfWeek.setHours(23, 59, 59, 999);
//             matchCondition.createdAt = {
//                 $gte: startOfWeek,
//                 $lte: endOfWeek,
//             };
//             console.log("Match Condition for Weekly:", { ...matchCondition, startOfWeek, endOfWeek });
//         } else if (filter === "monthly") {
//             const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
//             const selectedYear = year ? parseInt(year) : now.getFullYear();
//             matchCondition.createdAt = {
//                 $gte: new Date(selectedYear, selectedMonth, 1),
//                 $lte: new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999),
//             };
//         } else if (filter === "yearly") {
//             const selectedYear = year ? parseInt(year) : now.getFullYear();
//             matchCondition.createdAt = {
//                 $gte: new Date(selectedYear, 0, 1),
//                 $lte: new Date(selectedYear, 11, 31, 23, 59, 59, 999),
//             };
//         } else if (filter === "custom" && startDate && endDate) {
//             const start = new Date(startDate);
//             const end = new Date(endDate);

//             if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//                 return res.status(400).json({ message: "Invalid date format" });
//             }

//             if (start > end) {
//                 return res.status(400).json({ message: "Start date must be before end date" });
//             }

//             end.setHours(23, 59, 59, 999);
//             matchCondition.createdAt = {
//                 $gte: start,
//                 $lte: end,
//             };
//         } else {
//             return res.status(400).json({ message: "Invalid or missing filter parameter" });
//         }

//         console.log("Match Condition:", matchCondition);
//         const orders = await Order.find(matchCondition)
//             .populate("userId", "fname lname")
//             .populate("appliedCoupon")
//             .populate({ path: "items.productId", model: "Product" });
//         console.log("Orders Found:", orders.length);

//         if (!orders.length) {
//             return res.status(404).json({ message: "No orders found for the selected filter" });
//         }

//         const pendingOrdersCount = await Order.countDocuments({ status: "Pending" });
//         const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
//         const totalOrders = orders.length;
//         const totalProductsSold = orders.reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0);
//         const totalUsers = new Set(orders.map(order => order.userId?._id.toString())).size;

//         const totalDiscount = orders.reduce((sum, order) => {
//             return sum + order.items.reduce((discountSum, item) => {
//                 const product = item.productId;
//                 const itemDiscount = product.isOfferActive ? (product.price - product.Offerprice) * item.quantity : 0;
//                 return discountSum + itemDiscount;
//             }, 0);
//         }, 0);

//         const totalCouponDiscount = orders.reduce((sum, order) => {
//             if (order.appliedCoupon) {
//                 const coupon = order.appliedCoupon;
//                 const itemTotal = order.items.reduce((sum, item) => sum + item.totalprice * item.quantity, 0);
//                 if (coupon.discountType === 'percentage') {
//                     return sum + (itemTotal * (coupon.value / 100));
//                 } else if (coupon.discountType === 'flat') {
//                     return sum + coupon.value;
//                 }
//             }
//             return sum;
//         }, 0);

//         const totalAllDiscount = totalDiscount + totalCouponDiscount;
//         const totalCollection = totalSales - totalAllDiscount;

//         const salesData = orders.map(order => {
//             const itemTotal = order.items.reduce((sum, item) => sum + item.totalprice * item.quantity, 0);
//             const discountAmount = order.items.reduce((sum, item) => {
//                 const product = item.productId;
//                 const itemDiscount = product.isOfferActive ? (product.price - product.Offerprice) * item.quantity : 0;
//                 return sum + itemDiscount;
//             }, 0);
//             const couponDiscount = order.appliedCoupon ? (order.appliedCoupon.discountType === 'percentage' ? (itemTotal * (order.appliedCoupon.value / 100)) : order.appliedCoupon.value) : 0;
//             const finalAmount = order.totalAmount;

//             return {
//                 "Order ID": order._id.toString(),
//                 "Date": order.createdAt.toISOString().split("T")[0],
//                 "Total Items": order.items.reduce((sum, item) => sum + item.quantity, 0),
//                 "Total Amount": `${itemTotal.toFixed(2)}`,
//                 "Discount Applied": `${discountAmount.toFixed(2)}`,
//                 "Coupon Discount": `${couponDiscount.toFixed(2)}`,
//                 "Final Amount": `${finalAmount.toFixed(2)}`,
//                 "Payment Method": order.paymentMethod,
//                 "Order Status": order.status,
//             };
//         });

//         const pdfFormatData = orders.map(order => {
//             const itemTotal = order.items.reduce((sum, item) => sum + item.totalprice * item.quantity, 0);
//             const discountAmount = order.items.reduce((sum, item) => {
//                 const product = item.productId;
//                 const itemDiscount = product.isOfferActive ? (product.price - product.Offerprice) * item.quantity : 0;
//                 return sum + itemDiscount;
//             }, 0);
//             const couponDiscount = order.appliedCoupon ? (order.appliedCoupon.discountType === 'percentage' ? (itemTotal * (order.appliedCoupon.value / 100)) : order.appliedCoupon.value) : 0;
//             const finalAmount = order.totalAmount;

//             return {
//                 "Order ID": order._id.toString().substring(0, 9) + "...",
//                 "Date": order.createdAt.toISOString().split("T")[0],
//                 "Items": order.items.reduce((sum, item) => sum + item.quantity, 0),
//                 "Total": `${itemTotal.toFixed(2)}`,
//                 "Discount": `${discountAmount.toFixed(2)}`,
//                 "Coupon": `${couponDiscount.toFixed(2)}`,
//                 "Final": `${finalAmount.toFixed(2)}`,
//                 "Payment": order.paymentMethod,
//                 "Status": order.status,
//             };
//         });

//         if (fileFormat === "json") {
//             return res.json({
//                 totalSales,
//                 totalOrders,
//                 totalProductsSold,
//                 totalUsers,
//                 totalCollection,
//                 totalDiscount,
//                 totalCouponDiscount,
//                 totalAllDiscount,
//                 pendingOrdersCount,
//                 orders: salesData
//             });
//         }

//         const reportsDir = path.join("sales-reports");
//         if (!fs.existsSync(reportsDir)) {
//             fs.mkdirSync(reportsDir, { recursive: true });
//         }

//         if (fileFormat === "excel") {
//             const filePath = path.join(reportsDir, `sales-report-${Date.now()}.xlsx`);
//             const wb = XLSX.utils.book_new();

//             // Order Details Sheet
//             const ws = XLSX.utils.aoa_to_sheet([
//                 ["Order Details"],
//                 [],
//                 ["Order ID", "Date", "Items", "Total", "Offer Discount", "Coupon", "Final", "Payment", "Status"]
//             ]);
//             pdfFormatData.forEach(order => {
//                 XLSX.utils.sheet_add_aoa(ws, [[
//                     order["Order ID"],
//                     order["Date"],
//                     order["Items"],
//                     order["Total"],
//                     order["Discount"],
//                     order["Coupon"],
//                     order["Final"],
//                     order["Payment"],
//                     order["Status"]
//                 ]], { origin: -1 });
//             });
//             ws['!cols'] = [
//                 { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
//             ];
//             const headerStyle = {
//                 fill: { fgColor: { rgb: "224ABE" } },
//                 font: { bold: true, color: { rgb: "FFFFFF" } },
//                 alignment: { horizontal: "center", vertical: "center" }
//             };
//             const titleStyle = {
//                 font: { bold: true, sz: 16, color: { rgb: "224ABE" } },
//                 alignment: { horizontal: "left" }
//             };
//             const dataStyle = {
//                 alignment: { horizontal: "center", vertical: "center" },
//                 border: {
//                     top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
//                 }
//             };
//             const deliveredStyle = {
//                 font: { color: { rgb: "28A745" }, bold: true },
//                 alignment: { horizontal: "center", vertical: "center" },
//                 border: {
//                     top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
//                 }
//             };
//             ws.A1.s = titleStyle;
//             for (let i = 0; i < 9; i++) {
//                 const cell = XLSX.utils.encode_cell({ r: 2, c: i });
//                 if (!ws[cell]) ws[cell] = { v: "" };
//                 ws[cell].s = headerStyle;
//             }
//             for (let i = 0; i < pdfFormatData.length; i++) {
//                 for (let j = 0; j < 9; j++) {
//                     const cell = XLSX.utils.encode_cell({ r: i + 3, c: j });
//                     if (!ws[cell]) ws[cell] = { v: "" };
//                     if (j === 8 && pdfFormatData[i].Status === "Delivered") {
//                         ws[cell].s = deliveredStyle;
//                     } else {
//                         ws[cell].s = dataStyle;
//                     }
//                     if (i % 2 === 1) {
//                         if (!ws[cell].s) ws[cell].s = {};
//                         ws[cell].s.fill = { fgColor: { rgb: "F3F6FF" } };
//                     }
//                 }
//             }
//             ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
//             XLSX.utils.book_append_sheet(wb, ws, "Order Details");

//             // Summary Sheet
//             const summaryData = [
//                 { Metric: "Total Sales", Value: `${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
//                 { Metric: "Total Orders", Value: totalOrders.toString() },
//                 { Metric: "Total Products Sold", Value: totalProductsSold.toString() },
//                 { Metric: "Total Users", Value: totalUsers.toString() },
//                 { Metric: "Total Discount", Value: `${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
//                 { Metric: "Total Coupon Discount", Value: `${totalCouponDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
//             ];
//             const summaryWs = XLSX.utils.json_to_sheet(summaryData);
//             summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }];

//             // Add header styles
//             const headerRow = summaryWs["!ref"].split(":")[0];
//             for (let col = 1; col <= summaryWs["!cols"].length; col++) {
//                 const cell = XLSX.utils.encode_cell({ r: parseInt(headerRow.match(/\d+/)[0]) - 1, c: col - 1 });
//                 if (summaryWs[cell]) {
//                     summaryWs[cell].s = headerStyle;
//                 }
//             }

//             // Add data styles
//             for (let row = 2; row <= summaryWs["!ref"].split(":")[1].match(/\d+/)[0]; row++) {
//                 for (let col = 1; col <= summaryWs["!cols"].length; col++) {
//                     const cell = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
//                     if (summaryWs[cell]) {
//                         summaryWs[cell].s = dataStyle;
//                     }
//                 }
//             }

//             XLSX.utils.book_append_sheet(wb, summaryWs, "Sales Summary");

//             XLSX.writeFile(wb, filePath, {
//                 bookType: 'xlsx',
//                 bookSST: false,
//                 type: 'binary',
//                 cellStyles: true
//             });

//             res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//             res.setHeader("Content-Disposition", `attachment; filename="VGURIE_Order_Details.xlsx"`);
//             return res.download(filePath, () => fs.unlinkSync(filePath));
//         }

//         if (fileFormat === "pdf") {
//             res.setHeader("Content-Type", "application/pdf");
//             res.setHeader("Content-Disposition", 'attachment; filename="VGURIE_Sales_Report.pdf"');
//             const doc = new PDFDocument({
//                 size: "A4",
//                 margin: 50,
//                 bufferPages: true
//             });
//             doc.pipe(res);

//             let reportTitle = "VGURIE Sales Report";
//             let dateRange = "";
//             if (filter === "daily") {
//                 dateRange = `for ${now.toLocaleDateString()}`;
//             } else if (filter === "weekly") {
//                 dateRange = `for week of ${startOfWeek.toLocaleDateString()} to ${endOfWeek.toLocaleDateString()}`;
//             } else if (filter === "monthly") {
//                 const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
//                 const selectedYear = year ? parseInt(year) : now.getFullYear();
//                 dateRange = `for ${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} ${selectedYear}`;
//             } else if (filter === "yearly") {
//                 const selectedYear = year ? parseInt(year) : now.getFullYear();
//                 dateRange = `for Year ${selectedYear}`;
//             } else if (filter === "custom") {
//                 dateRange = `from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
//             }

//             // Header
//             doc.rect(50, 50, 150, 50).stroke('#efefef');
//             doc.fontSize(14).fillColor('#224abe').text("VGURIE", 100, 70, { align: "center" });
//             doc.fontSize(24).font('Helvetica-Bold').fillColor('#224abe').text(reportTitle, 50, 120, { align: "center" });
//             doc.fontSize(16).font('Helvetica').fillColor('#000000').text(dateRange, 50, 155, { align: "center" });
//             doc.rect(50, 180, doc.page.width - 100, 2).fill('#224abe');

//             // Sales Summary
//             doc.fontSize(18).font('Helvetica-Bold').fillColor('#224abe').text("Sales Summary", 50, 200, { underline: true });
//             const summaryTable = {
//                 headers: ["Metric", "Value"],
//                 rows: [
//                     ["Total Sales", `${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
//                     ["Total Orders", totalOrders.toString()],
//                     ["Total Products Sold", totalProductsSold.toString()],
//                     ["Total Users", totalUsers.toString()],
//                     ["Total Discount", `${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
//                     ["Total Coupon Discount", `${totalCouponDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
//                 ]
//             };
//             let currentY = 220;
//             const summaryColWidths = [200, 200];
//             const summaryTableHeight = 30 + (summaryTable.rows.length * 20); // Header (30) + Rows (20 each)
//             doc.rect(50, currentY, summaryColWidths[0] + summaryColWidths[1], 30).fill('#224abe');
//             doc.fillColor("#ffffff").font('Helvetica-Bold').fontSize(12);
//             summaryTable.headers.forEach((header, i) => {
//                 doc.text(
//                     header,
//                     50 + (i === 0 ? 20 : summaryColWidths[0] + 20),
//                     currentY + 10,
//                     { width: summaryColWidths[i] - 40, align: i === 0 ? "left" : "right" }
//                 );
//             });
//             currentY += 30;
//             doc.font('Helvetica').fontSize(10);
//             summaryTable.rows.forEach((row, rowIndex) => {
//                 if (rowIndex % 2 === 1) {
//                     doc.rect(50, currentY, summaryColWidths[0] + summaryColWidths[1], 20).fill('#f3f6ff');
//                 } else {
//                     doc.rect(50, currentY, summaryColWidths[0] + summaryColWidths[1], 20).fill('#ffffff');
//                 }
//                 doc.fillColor("#000000");
//                 doc.text(row[0], 70, currentY + 5, { width: summaryColWidths[0] - 40, align: "left" });
//                 const isImportant = row[0].includes("Total Sales") || row[0].includes("Collection");
//                 doc.font(isImportant ? 'Helvetica-Bold' : 'Helvetica');
//                 doc.text(row[1], 50 + summaryColWidths[0], currentY + 5, { width: summaryColWidths[1] - 40, align: "right" });
//                 doc.font('Helvetica');
//                 currentY += 20;
//             });
//             doc.rect(50, 220, summaryColWidths[0] + summaryColWidths[1], summaryTableHeight).stroke('#cccccc');
//             currentY += 10; // Reduced spacing after table
//             doc.rect(50, currentY, doc.page.width - 100, 2).fill('#224abe');

//             // Order Details
//             currentY += 20; // Reduced spacing before next section
//             if (currentY + 50 > doc.page.height - 100) { // Check if we need a new page
//                 doc.addPage();
//                 currentY = 50;
//             }
//             doc.fontSize(18).font('Helvetica-Bold').fillColor('#224abe').text("Order Details", 50, currentY, { underline: true });
//             currentY += 20;
//             const tableHeaders = ["Order ID", "Date", "Items", "Total", "Discount", "Coupon", "Final", "Payment", "Status"];
//             const colWidths = [80, 60, 40, 60, 60, 60, 60, 60, 50];
//             const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
//             const rowHeight = 20; // Reduced row height
//             const maxRowsPerPage = Math.floor((doc.page.height - 100 - currentY) / rowHeight) - 1; // Adjust based on remaining space

//             let tableY = currentY;
//             const addTableHeaders = (y) => {
//                 doc.rect(50, y, tableWidth, 25).fill('#224abe');
//                 let xOffset = 50;
//                 doc.fillColor("#ffffff").font('Helvetica-Bold').fontSize(9);
//                 tableHeaders.forEach((header, i) => {
//                     doc.text(header, xOffset + 5, y + 8, { width: colWidths[i] - 10, align: "center" });
//                     xOffset += colWidths[i];
//                 });
//                 return y + 25;
//             };
//             tableY = addTableHeaders(tableY);
//             doc.font('Helvetica').fontSize(8); // Reduced font size

//             let rowCount = 0;
//             for (let i = 0; i < pdfFormatData.length; i++) {
//                 if (rowCount >= maxRowsPerPage) {
//                     doc.addPage();
//                     currentY = 50;
//                     doc.fontSize(10).fillColor('#224abe').text("VGURIE Sales Report - Continued", 50, currentY, { align: "center" });
//                     currentY += 20;
//                     tableY = addTableHeaders(currentY);
//                     rowCount = 0;
//                 }
//                 const order = pdfFormatData[i];
//                 if (i % 2 === 1) {
//                     doc.rect(50, tableY, tableWidth, rowHeight).fill('#f3f6ff');
//                 } else {
//                     doc.rect(50, tableY, tableWidth, rowHeight).fill('#ffffff');
//                 }
//                 doc.rect(50, tableY, tableWidth, rowHeight).stroke('#cccccc');
//                 doc.fillColor("#000000");
//                 let xOffset = 50;
//                 doc.text(order["Order ID"], xOffset + 5, tableY + 5, { width: colWidths[0] - 10, align: "left" });
//                 xOffset += colWidths[0];
//                 doc.text(order["Date"], xOffset + 5, tableY + 5, { width: colWidths[1] - 10, align: "center" });
//                 xOffset += colWidths[1];
//                 doc.text(order["Items"].toString(), xOffset + 5, tableY + 5, { width: colWidths[2] - 10, align: "center" });
//                 xOffset += colWidths[2];
//                 doc.text(order["Total"], xOffset + 5, tableY + 5, { width: colWidths[3] - 10, align: "right" });
//                 xOffset += colWidths[3];
//                 doc.text(order["Discount"], xOffset + 5, tableY + 5, { width: colWidths[4] - 10, align: "right" });
//                 xOffset += colWidths[4];
//                 doc.text(order["Coupon"], xOffset + 5, tableY + 5, { width: colWidths[5] - 10, align: "right" });
//                 xOffset += colWidths[5];
//                 doc.text(order["Final"], xOffset + 5, tableY + 5, { width: colWidths[6] - 10, align: "right" });
//                 xOffset += colWidths[6];
//                 doc.text(order["Payment"], xOffset + 5, tableY + 5, { width: colWidths[7] - 10, align: "center" });
//                 xOffset += colWidths[7];
//                 const statusColor = order["Status"] === "Delivered" ? "#28a745" :
//                                    order["Status"] === "Pending" ? "#ffc107" :
//                                    order["Status"] === "Cancelled" ? "#dc3545" : "#000000";
//                 doc.fillColor(statusColor).font('Helvetica-Bold');
//                 doc.text(order["Status"], xOffset + 5, tableY + 5, { width: colWidths[8] - 10, align: "center" });
//                 doc.fillColor("#000000").font('Helvetica');
//                 tableY += rowHeight;
//                 rowCount++;
//             }
//             currentY = tableY;

//             // Payment Method Analysis
//             const paymentMethods = {};
//             orders.forEach(order => {
//                 const method = order.paymentMethod || 'Unknown';
//                 if (!paymentMethods[method]) {
//                     paymentMethods[method] = { count: 0, total: 0 };
//                 }
//                 paymentMethods[method].count++;
//                 paymentMethods[method].total += order.totalAmount - (order.refundedAmount || 0) - (order.couponDiscount || 0);
//             });
//             const paymentTable = {
//                 headers: ["Payment Method", "Number of Orders", "Total Amount"],
//                 rows: Object.entries(paymentMethods).map(([method, data]) => [
//                     method,
//                     data.count.toString(),
//                     `${data.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
//                 ])
//             };
//             const paymentTableHeight = 25 + (paymentTable.rows.length * 20); // Header (25) + Rows (20 each)
//             if (currentY + paymentTableHeight + 50 < doc.page.height - 50) { // Check if there's enough space
//                 currentY += 20; // Reduced spacing
//                 doc.fontSize(18).font('Helvetica-Bold').fillColor('#224abe').text("Payment Method Analysis", 50, currentY, { underline: true });
//                 currentY += 20;
//                 const paymentColWidths = [150, 150, 150];
//                 const paymentTableWidth = paymentColWidths.reduce((sum, width) => sum + width, 0);
//                 doc.rect(50, currentY, paymentTableWidth, 25).fill('#224abe');
//                 let pmXOffset = 50;
//                 doc.fillColor("#ffffff").font('Helvetica-Bold').fontSize(10);
//                 paymentTable.headers.forEach((header, i) => {
//                     doc.text(header, pmXOffset + 5, currentY + 8, { width: paymentColWidths[i] - 10, align: "center" });
//                     pmXOffset += paymentColWidths[i];
//                 });
//                 currentY += 25;
//                 doc.font('Helvetica').fontSize(9);
//                 paymentTable.rows.forEach((row, rowIndex) => {
//                     if (rowIndex % 2 === 1) {
//                         doc.rect(50, currentY, paymentTableWidth, 20).fill('#f3f6ff');
//                     } else {
//                         doc.rect(50, currentY, paymentTableWidth, 20).fill('#ffffff');
//                     }
//                     doc.rect(50, currentY, paymentTableWidth, 20).stroke('#cccccc');
//                     pmXOffset = 50;
//                     doc.fillColor("#000000");
//                     row.forEach((cell, i) => {
//                         doc.text(cell, pmXOffset + 5, currentY + 5, { width: paymentColWidths[i] - 10, align: i === 0 ? "left" : "center" });
//                         pmXOffset += paymentColWidths[i];
//                     });
//                     currentY += 20;
//                 });
//             } else {
//                 doc.addPage();
//                 currentY = 50;
//                 doc.fontSize(18).font('Helvetica-Bold').fillColor('#224abe').text("Payment Method Analysis", 50, currentY, { underline: true });
//                 currentY += 20;
//                 const paymentColWidths = [150, 150, 150];
//                 const paymentTableWidth = paymentColWidths.reduce((sum, width) => sum + width, 0);
//                 doc.rect(50, currentY, paymentTableWidth, 25).fill('#224abe');
//                 let pmXOffset = 50;
//                 doc.fillColor("#ffffff").font('Helvetica-Bold').fontSize(10);
//                 paymentTable.headers.forEach((header, i) => {
//                     doc.text(header, pmXOffset + 5, currentY + 8, { width: paymentColWidths[i] - 10, align: "center" });
//                     pmXOffset += paymentColWidths[i];
//                 });
//                 currentY += 25;
//                 doc.font('Helvetica').fontSize(9);
//                 paymentTable.rows.forEach((row, rowIndex) => {
//                     if (rowIndex % 2 === 1) {
//                         doc.rect(50, currentY, paymentTableWidth, 20).fill('#f3f6ff');
//                     } else {
//                         doc.rect(50, currentY, paymentTableWidth, 20).fill('#ffffff');
//                     }
//                     doc.rect(50, currentY, paymentTableWidth, 20).stroke('#cccccc');
//                     pmXOffset = 50;
//                     doc.fillColor("#000000");
//                     row.forEach((cell, i) => {
//                         doc.text(cell, pmXOffset + 5, currentY + 5, { width: paymentColWidths[i] - 10, align: i === 0 ? "left" : "center" });
//                         pmXOffset += paymentColWidths[i];
//                     });
//                     currentY += 20;
//                 });
//             }

//             // Footer
//             const totalPages = doc.bufferedPageCount;
//             for (let i = 0; i < totalPages; i++) {
//                 doc.switchToPage(i);
//                 doc.rect(50, doc.page.height - 40, doc.page.width - 100, 2).fill('#224abe');
//                 doc.fontSize(8).fillColor('#666666').text(
//                     `Report generated on: ${new Date().toLocaleString()}`,
//                     50,
//                     doc.page.height - 30,
//                     { align: "left", width: doc.page.width - 100 }
//                 );
//                 doc.fontSize(8).fillColor('#666666').text(
//                     `Page ${i + 1} of ${totalPages}`,
//                     50,
//                     doc.page.height - 30,
//                     { align: "right", width: doc.page.width - 100 }
//                 );
//             }

//             doc.end();
//             return;
//         }
//     } catch (error) {
//         console.error("Error generating sales report:", error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };

export const salesreportget = async (req, res) => {
  try {
    const { filter, startDate, endDate, format, month, year } = req.query;

    if (!format) {
      return res.status(400).json({ message: "Format parameter is required" });
    }

    const fileFormat = format.toLowerCase();
    if (!["excel", "pdf", "json"].includes(fileFormat)) {
      return res
        .status(400)
        .json({ message: "Invalid format specified. Use excel, pdf, or json" });
    }

    let matchCondition = { status: "Delivered" };
    const now = new Date();
    let startOfWeek, endOfWeek;

    // Filter logic
    if (filter === "daily") {
      matchCondition.createdAt = {
        $gte: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0
        ),
        $lt: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        ),
      };
    } else if (filter === "weekly") {
      startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((now.getDay() + 1) % 7)); // Previous Saturday
      startOfWeek.setHours(0, 0, 0, 0);
      endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Following Friday
      endOfWeek.setHours(23, 59, 59, 999);
      matchCondition.createdAt = {
        $gte: startOfWeek,
        $lte: endOfWeek,
      };
      console.log("Match Condition for Weekly:", {
        ...matchCondition,
        startOfWeek,
        endOfWeek,
      });
    } else if (filter === "monthly") {
      const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
      const selectedYear = year ? parseInt(year) : now.getFullYear();
      matchCondition.createdAt = {
        $gte: new Date(selectedYear, selectedMonth, 1),
        $lte: new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999),
      };
    } else if (filter === "yearly") {
      const selectedYear = year ? parseInt(year) : now.getFullYear();
      matchCondition.createdAt = {
        $gte: new Date(selectedYear, 0, 1),
        $lte: new Date(selectedYear, 11, 31, 23, 59, 59, 999),
      };
    } else if (filter === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      if (start > end) {
        return res
          .status(400)
          .json({ message: "Start date must be before end date" });
      }

      end.setHours(23, 59, 59, 999);
      matchCondition.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else {
      return res
        .status(400)
        .json({ message: "Invalid or missing filter parameter" });
    }

    console.log("Match Condition:", matchCondition);
    const orders = await Order.find(matchCondition)
      .populate("userId", "fname lname")
      .populate("appliedCoupon")
      .populate({ path: "items.productId", model: "Product" });
    console.log("Orders Found:", orders.length);

    if (!orders.length) {
      return res
        .status(404)
        .json({ message: "No orders found for the selected filter" });
    }

    const pendingOrdersCount = await Order.countDocuments({
      status: "Pending",
    });
    const totalSales = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const totalOrders = orders.length;
    const totalProductsSold = orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((s, item) => s + item.quantity, 0),
      0
    );
    const totalUsers = new Set(
      orders.map((order) => order.userId?._id.toString())
    ).size;

    const totalDiscount = orders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((discountSum, item) => {
          const product = item.productId;
          const itemDiscount = product.isOfferActive
            ? (product.price - product.Offerprice) * item.quantity
            : 0;
          return discountSum + itemDiscount;
        }, 0)
      );
    }, 0);

    const totalCouponDiscount = orders.reduce((sum, order) => {
      if (order.appliedCoupon) {
        const coupon = order.appliedCoupon;
        const itemTotal = order.items.reduce(
          (sum, item) => sum + item.totalprice * item.quantity,
          0
        );
        if (coupon.discountType === "percentage") {
          return sum + itemTotal * (coupon.value / 100);
        } else if (coupon.discountType === "flat") {
          return sum + coupon.value;
        }
      }
      return sum;
    }, 0);

    const totalAllDiscount = totalDiscount + totalCouponDiscount;
    const totalCollection = totalSales - totalAllDiscount;

    const salesData = orders.map((order) => {
      const itemTotal = order.items.reduce(
        (sum, item) => sum + item.totalprice * item.quantity,
        0
      );
      const discountAmount = order.items.reduce((sum, item) => {
        const product = item.productId;
        const itemDiscount = product.isOfferActive
          ? (product.price - product.Offerprice) * item.quantity
          : 0;
        return sum + itemDiscount;
      }, 0);
      const couponDiscount = order.appliedCoupon
        ? order.appliedCoupon.discountType === "percentage"
          ? itemTotal * (order.appliedCoupon.value / 100)
          : order.appliedCoupon.value
        : 0;
      const finalAmount = order.totalAmount;

      return {
        "Order ID": order._id.toString(),
        Date: order.createdAt.toISOString().split("T")[0],
        "Total Items": order.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        ),
        "Total Amount": `${itemTotal.toFixed(2)}`,
        "Discount Applied": `${discountAmount.toFixed(2)}`,
        "Coupon Discount": `${couponDiscount.toFixed(2)}`,
        "Final Amount": `${finalAmount.toFixed(2)}`,
        "Payment Method": order.paymentMethod,
        "Order Status": order.status,
      };
    });

    const pdfFormatData = orders.map((order) => {
      const itemTotal = order.items.reduce(
        (sum, item) => sum + item.totalprice * item.quantity,
        0
      );
      const discountAmount = order.items.reduce((sum, item) => {
        const product = item.productId;
        const itemDiscount = product.isOfferActive
          ? (product.price - product.Offerprice) * item.quantity
          : 0;
        return sum + itemDiscount;
      }, 0);
      const couponDiscount = order.appliedCoupon
        ? order.appliedCoupon.discountType === "percentage"
          ? itemTotal * (order.appliedCoupon.value / 100)
          : order.appliedCoupon.value
        : 0;
      const finalAmount = order.totalAmount;

      return {
        "Order ID": order._id.toString().substring(0, 9) + "...",
        Date: order.createdAt.toISOString().split("T")[0],
        Items: order.items.reduce((sum, item) => sum + item.quantity, 0),
        Total: `${itemTotal.toFixed(2)}`,
        Discount: `${discountAmount.toFixed(2)}`,
        Coupon: `${couponDiscount.toFixed(2)}`,
        Final: `${finalAmount.toFixed(2)}`,
        Payment: order.paymentMethod,
        Status: order.status,
      };
    });

    if (fileFormat === "json") {
      return res.json({
        totalSales,
        totalOrders,
        totalProductsSold,
        totalUsers,
        totalCollection,
        totalDiscount,
        totalCouponDiscount,
        totalAllDiscount,
        pendingOrdersCount,
        orders: salesData,
      });
    }

    const reportsDir = path.join("sales-reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    if (fileFormat === "excel") {
      const filePath = path.join(reportsDir, `sales-report-${Date.now()}.xlsx`);
      const wb = XLSX.utils.book_new();

      // Order Details Sheet
      const ws = XLSX.utils.aoa_to_sheet([
        ["Order Details"],
        [],
        [
          "Order ID",
          "Date",
          "Items",
          "Total",
          "Offer Discount",
          "Coupon",
          "Final",
          "Payment",
          "Status",
        ],
      ]);
      pdfFormatData.forEach((order) => {
        XLSX.utils.sheet_add_aoa(
          ws,
          [
            [
              order["Order ID"],
              order["Date"],
              order["Items"],
              order["Total"],
              order["Discount"],
              order["Coupon"],
              order["Final"],
              order["Payment"],
              order["Status"],
            ],
          ],
          { origin: -1 }
        );
      });
      ws["!cols"] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];
      const headerStyle = {
        fill: { fgColor: { rgb: "224ABE" } },
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
      const titleStyle = {
        font: { bold: true, sz: 16, color: { rgb: "224ABE" } },
        alignment: { horizontal: "left" },
      };
      const dataStyle = {
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };
      const deliveredStyle = {
        font: { color: { rgb: "28A745" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };
      ws.A1.s = titleStyle;
      for (let i = 0; i < 9; i++) {
        const cell = XLSX.utils.encode_cell({ r: 2, c: i });
        if (!ws[cell]) ws[cell] = { v: "" };
        ws[cell].s = headerStyle;
      }
      for (let i = 0; i < pdfFormatData.length; i++) {
        for (let j = 0; j < 9; j++) {
          const cell = XLSX.utils.encode_cell({ r: i + 3, c: j });
          if (!ws[cell]) ws[cell] = { v: "" };
          if (j === 8 && pdfFormatData[i].Status === "Delivered") {
            ws[cell].s = deliveredStyle;
          } else {
            ws[cell].s = dataStyle;
          }
          if (i % 2 === 1) {
            if (!ws[cell].s) ws[cell].s = {};
            ws[cell].s.fill = { fgColor: { rgb: "F3F6FF" } };
          }
        }
      }
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
      XLSX.utils.book_append_sheet(wb, ws, "Order Details");

      // Summary Sheet
      const summaryData = [
        {
          Metric: "Total Sales",
          Value: `${totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        { Metric: "Total Orders", Value: totalOrders.toString() },
        { Metric: "Total Products Sold", Value: totalProductsSold.toString() },
        { Metric: "Total Users", Value: totalUsers.toString() },
        {
          Metric: "Total Discount",
          Value: `${totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
          Metric: "Total Coupon Discount",
          Value: `${totalCouponDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }];

      // Add header styles
      const headerRow = summaryWs["!ref"].split(":")[0];
      for (let col = 1; col <= summaryWs["!cols"].length; col++) {
        const cell = XLSX.utils.encode_cell({
          r: parseInt(headerRow.match(/\d+/)[0]) - 1,
          c: col - 1,
        });
        if (summaryWs[cell]) {
          summaryWs[cell].s = headerStyle;
        }
      }

      // Add data styles
      for (
        let row = 2;
        row <= summaryWs["!ref"].split(":")[1].match(/\d+/)[0];
        row++
      ) {
        for (let col = 1; col <= summaryWs["!cols"].length; col++) {
          const cell = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
          if (summaryWs[cell]) {
            summaryWs[cell].s = dataStyle;
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, summaryWs, "Sales Summary");

      XLSX.writeFile(wb, filePath, {
        bookType: "xlsx",
        bookSST: false,
        type: "binary",
        cellStyles: true,
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="VGURIE_Order_Details.xlsx"`
      );
      return res.download(filePath, () => fs.unlinkSync(filePath));
    }

    if (fileFormat === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="VGURIE_Sales_Report.pdf"'
      );
      const doc = new PDFDocument({
        size: "A4",
        margin: 40, // Slightly reduced margin for more content space
        bufferPages: true,
      });
      doc.pipe(res);

      // Professional Header with Gradient
      doc.save();
      doc.rect(40, 40, doc.page.width - 80, 80).fill({
        type: "linear",
        start: [40, 40],
        end: [40, 120],
        stops: [
          { pos: 0, color: "#224ABE" },
          { pos: 1, color: "#4A90E2" },
        ],
      });
      doc
        .fillColor("#FFFFFF")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("VGURIE", doc.page.width / 2, 60, { align: "center" });
      doc
        .fontSize(14)
        .text("Sales Report", doc.page.width / 2, 90, { align: "center" });

      let dateRange = "";
      if (filter === "daily") {
        dateRange = `for ${now.toLocaleDateString()}`;
      } else if (filter === "weekly") {
        dateRange = `for week of ${startOfWeek.toLocaleDateString()} to ${endOfWeek.toLocaleDateString()}`;
      } else if (filter === "monthly") {
        const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
        const selectedYear = year ? parseInt(year) : now.getFullYear();
        dateRange = `for ${new Date(selectedYear, selectedMonth).toLocaleString("default", { month: "long" })} ${selectedYear}`;
      } else if (filter === "yearly") {
        const selectedYear = year ? parseInt(year) : now.getFullYear();
        dateRange = `for Year ${selectedYear}`;
      } else if (filter === "custom") {
        dateRange = `from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
      }
      doc
        .fillColor("#FFFFFF")
        .fontSize(10)
        .text(dateRange, doc.page.width / 2, 110, { align: "center" });
      doc.restore();
      doc
        .moveTo(40, 130)
        .lineTo(doc.page.width - 40, 130)
        .stroke("#4A90E2");

      // Sales Summary
      let currentY = 140;
      doc
        .fillColor("#333333")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Sales Summary", 40, currentY, {
          underline: true,
          color: "#224ABE",
        });
      currentY += 20;
      const summaryTable = {
        headers: ["Metric", "Value"],
        rows: [
          [
            "Total Sales",
            `${totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ],
          ["Total Orders", totalOrders.toString()],
          ["Total Products Sold", totalProductsSold.toString()],
          ["Total Users", totalUsers.toString()],
          [
            "Total Discount",
            `${totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ],
          [
            "Total Coupon Discount",
            `${totalCouponDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ],
        ],
      };
      const summaryColWidths = [200, 200];
      const summaryTableHeight = 25 + summaryTable.rows.length * 20;
      doc
        .rect(40, currentY, summaryColWidths[0] + summaryColWidths[1], 25)
        .fill("#4A90E2");
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
      summaryTable.headers.forEach((header, i) => {
        doc.text(
          header,
          40 + (i === 0 ? 10 : summaryColWidths[0] + 10),
          currentY + 8,
          { width: summaryColWidths[i] - 20, align: i === 0 ? "left" : "right" }
        );
      });
      currentY += 25;
      doc.font("Helvetica").fontSize(9);
      summaryTable.rows.forEach((row, rowIndex) => {
        const fillColor = rowIndex % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
        doc
          .rect(40, currentY, summaryColWidths[0] + summaryColWidths[1], 20)
          .fill(fillColor);
        doc
          .rect(40, currentY, summaryColWidths[0] + summaryColWidths[1], 20)
          .stroke("#E5E7EB");
        doc.fillColor("#333333");
        doc.text(row[0], 50, currentY + 5, {
          width: summaryColWidths[0] - 20,
          align: "left",
        });
        const isImportant =
          row[0].includes("Total Sales") || row[0].includes("Collection");
        doc.font(isImportant ? "Helvetica-Bold" : "Helvetica");
        doc.text(row[1], 40 + summaryColWidths[0], currentY + 5, {
          width: summaryColWidths[1] - 20,
          align: "right",
        });
        doc.font("Helvetica");
        currentY += 20;
      });
      currentY += 10;
      doc
        .moveTo(40, currentY)
        .lineTo(doc.page.width - 40, currentY)
        .stroke("#4A90E2");

      // Order Details
      currentY += 20;
      if (currentY + 50 > doc.page.height - 80) {
        doc.addPage();
        currentY = 40;
      }
      doc
        .fillColor("#333333")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Order Details", 40, currentY, {
          underline: true,
          color: "#224ABE",
        });
      currentY += 20;
      const tableHeaders = [
        "Order ID",
        "Date",
        "Items",
        "Total",
        "Discount",
        "Coupon",
        "Final",
        "Payment",
        "Status",
      ];
      const colWidths = [80, 60, 40, 60, 60, 60, 60, 60, 50];
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
      const rowHeight = 20;
      const maxRowsPerPage =
        Math.floor((doc.page.height - 80 - currentY) / rowHeight) - 1;

      let tableY = currentY;
      const addTableHeaders = (y) => {
        doc.rect(40, y, tableWidth, 25).fill("#224ABE");
        let xOffset = 40;
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
        tableHeaders.forEach((header, i) => {
          doc.text(header, xOffset + 5, y + 8, {
            width: colWidths[i] - 10,
            align: "center",
          });
          xOffset += colWidths[i];
        });
        return y + 25;
      };
      tableY = addTableHeaders(tableY);
      doc.font("Helvetica").fontSize(8);

      let rowCount = 0;
      for (let i = 0; i < pdfFormatData.length; i++) {
        if (rowCount >= maxRowsPerPage) {
          doc.addPage();
          currentY = 40;
          doc
            .fillColor("#224ABE")
            .fontSize(10)
            .text(
              "VGURIE Sales Report - Continued",
              doc.page.width / 2,
              currentY,
              { align: "center" }
            );
          currentY += 20;
          tableY = addTableHeaders(currentY);
          rowCount = 0;
        }
        const order = pdfFormatData[i];
        const fillColor = i % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
        doc.rect(40, tableY, tableWidth, rowHeight).fill(fillColor);
        doc.rect(40, tableY, tableWidth, rowHeight).stroke("#E5E7EB");
        doc.fillColor("#333333");
        let xOffset = 40;
        doc.text(order["Order ID"], xOffset + 5, tableY + 5, {
          width: colWidths[0] - 10,
          align: "left",
        });
        xOffset += colWidths[0];
        doc.text(order["Date"], xOffset + 5, tableY + 5, {
          width: colWidths[1] - 10,
          align: "center",
        });
        xOffset += colWidths[1];
        doc.text(order["Items"].toString(), xOffset + 5, tableY + 5, {
          width: colWidths[2] - 10,
          align: "center",
        });
        xOffset += colWidths[2];
        doc.text(order["Total"], xOffset + 5, tableY + 5, {
          width: colWidths[3] - 10,
          align: "right",
        });
        xOffset += colWidths[3];
        doc.text(order["Discount"], xOffset + 5, tableY + 5, {
          width: colWidths[4] - 10,
          align: "right",
        });
        xOffset += colWidths[4];
        doc.text(order["Coupon"], xOffset + 5, tableY + 5, {
          width: colWidths[5] - 10,
          align: "right",
        });
        xOffset += colWidths[5];
        doc.text(order["Final"], xOffset + 5, tableY + 5, {
          width: colWidths[6] - 10,
          align: "right",
        });
        xOffset += colWidths[6];
        doc.text(order["Payment"], xOffset + 5, tableY + 5, {
          width: colWidths[7] - 10,
          align: "center",
        });
        xOffset += colWidths[7];
        const statusColor =
          order["Status"] === "Delivered"
            ? "#28A745"
            : order["Status"] === "Pending"
              ? "#FFC107"
              : "#DC3545";
        doc.fillColor(statusColor).font("Helvetica-Bold");
        doc.text(order["Status"], xOffset + 5, tableY + 5, {
          width: colWidths[8] - 10,
          align: "center",
        });
        doc.fillColor("#333333").font("Helvetica");
        tableY += rowHeight;
        rowCount++;
      }
      currentY = tableY;

      // Payment Method Analysis
      const paymentMethods = {};
      orders.forEach((order) => {
        const method = order.paymentMethod || "Unknown";
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, total: 0 };
        }
        paymentMethods[method].count++;
        paymentMethods[method].total +=
          order.totalAmount -
          (order.refundedAmount || 0) -
          (order.couponDiscount || 0);
      });
      const paymentTable = {
        headers: ["Payment Method", "Number of Orders", "Total Amount"],
        rows: Object.entries(paymentMethods).map(([method, data]) => [
          method,
          data.count.toString(),
          `${data.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ]),
      };
      const paymentTableHeight = 25 + paymentTable.rows.length * 20;
      if (currentY + paymentTableHeight + 50 < doc.page.height - 40) {
        currentY += 20;
        doc
          .fillColor("#333333")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("Payment Method Analysis", 40, currentY, {
            underline: true,
            color: "#224ABE",
          });
        currentY += 20;
        const paymentColWidths = [150, 150, 150];
        const paymentTableWidth = paymentColWidths.reduce(
          (sum, width) => sum + width,
          0
        );
        doc.rect(40, currentY, paymentTableWidth, 25).fill("#224ABE");
        let pmXOffset = 40;
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
        paymentTable.headers.forEach((header, i) => {
          doc.text(header, pmXOffset + 5, currentY + 8, {
            width: paymentColWidths[i] - 10,
            align: "center",
          });
          pmXOffset += paymentColWidths[i];
        });
        currentY += 25;
        doc.font("Helvetica").fontSize(9);
        paymentTable.rows.forEach((row, rowIndex) => {
          const fillColor = rowIndex % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
          doc.rect(40, currentY, paymentTableWidth, 20).fill(fillColor);
          doc.rect(40, currentY, paymentTableWidth, 20).stroke("#E5E7EB");
          pmXOffset = 40;
          doc.fillColor("#333333");
          row.forEach((cell, i) => {
            doc.text(cell, pmXOffset + 5, currentY + 5, {
              width: paymentColWidths[i] - 10,
              align: i === 0 ? "left" : "center",
            });
            pmXOffset += paymentColWidths[i];
          });
          currentY += 20;
        });
      } else {
        doc.addPage();
        currentY = 40;
        doc
          .fillColor("#333333")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text("Payment Method Analysis", 40, currentY, {
            underline: true,
            color: "#224ABE",
          });
        currentY += 20;
        const paymentColWidths = [150, 150, 150];
        const paymentTableWidth = paymentColWidths.reduce(
          (sum, width) => sum + width,
          0
        );
        doc.rect(40, currentY, paymentTableWidth, 25).fill("#224ABE");
        let pmXOffset = 40;
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
        paymentTable.headers.forEach((header, i) => {
          doc.text(header, pmXOffset + 5, currentY + 8, {
            width: paymentColWidths[i] - 10,
            align: "center",
          });
          pmXOffset += paymentColWidths[i];
        });
        currentY += 25;
        doc.font("Helvetica").fontSize(9);
        paymentTable.rows.forEach((row, rowIndex) => {
          const fillColor = rowIndex % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
          doc.rect(40, currentY, paymentTableWidth, 20).fill(fillColor);
          doc.rect(40, currentY, paymentTableWidth, 20).stroke("#E5E7EB");
          pmXOffset = 40;
          doc.fillColor("#333333");
          row.forEach((cell, i) => {
            doc.text(cell, pmXOffset + 5, currentY + 5, {
              width: paymentColWidths[i] - 10,
              align: i === 0 ? "left" : "center",
            });
            pmXOffset += paymentColWidths[i];
          });
          currentY += 20;
        });
      }

      // Footer with Professional Design
      const totalPages = doc.bufferedPageCount;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc
          .rect(40, doc.page.height - 50, doc.page.width - 80, 10)
          .fill("#224ABE");
        doc
          .fillColor("#FFFFFF")
          .fontSize(8)
          .text(
            `Report generated on: ${new Date().toLocaleString()}`,
            50,
            doc.page.height - 45,
            { align: "left" }
          );
        doc.text(
          `Page ${i + 1} of ${totalPages}`,
          doc.page.width - 50,
          doc.page.height - 45,
          { align: "right" }
        );
      }

      doc.end();
      return;
    }
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// export const chart = async (req, res) => {
//     try {
//         const { filter, month, year, startDate, endDate, lineFilter = "week" } = req.query;

//         const now = new Date(); // Current date and time (e.g., March 09, 2025)
//         const currentMonth = month ? parseInt(month) - 1 : now.getMonth();
//         const currentYear = year ? parseInt(year) : now.getFullYear();

//         let matchConditions = { status: "Delivered" };
//         let startOfWeek, endOfWeek;

//         console.log("Query Parameters:", req.query);

//         // Set match conditions based on filter
//         if (filter === "daily") {
//             matchConditions.createdAt = {
//                 $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
//                 $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
//             };
//         } else if (filter === "weekly") {
//             startOfWeek = new Date(now);
//             startOfWeek.setDate(now.getDate() - ((now.getDay() + 1) % 7)); // Start at Saturday
//             startOfWeek.setHours(0, 0, 0, 0);
//             endOfWeek = new Date(now+1); // Include up to current time
//             matchConditions.createdAt = { $gte: startOfWeek, $lte: endOfWeek }; // Removed adjustForTimezone
//         } else if (filter === "monthly") {
//             matchConditions.createdAt = {
//                 $gte: new Date(currentYear, currentMonth, 1),
//                 $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999),
//             };
//         } else if (filter === "yearly") {
//             matchConditions.createdAt = {
//                 $gte: new Date(currentYear, 0, 1),
//                 $lte: new Date(currentYear, 11, 31, 23, 59, 59, 999),
//             };
//         } else if (filter === "custom" && startDate && endDate) {
//             const start = new Date(startDate);
//             const end = new Date(endDate);
//             if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//                 return res.status(400).json({ success: false, message: "Invalid date format" });
//             }
//             if (start > end) {
//                 return res.status(400).json({ success: false, message: "Start date must be before end date" });
//             }
//             end.setHours(23, 59, 59, 999);
//             matchConditions.createdAt = { $gte: start, $lte: end };
//         } else {
//             return res.status(400).json({ success: false, message: "Invalid or missing filter parameter" });
//         }

//         console.log("Match Conditions:", matchConditions);

//         // Declare all variables at the top
//         let barLabels = [];
//         let barSales = [];
//         let pieLabels = [];
//         let pieSales = [];
//         let lineLabels = [];
//         let lineSales = [];
//         let currentWeekSales = [];
//         let previousWeekSales = [];

//         // Calculate total sales first to ensure consistency
//         const totalSalesData = await Order.aggregate([
//             { $match: matchConditions },
//             { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
//         ]);
//         const expectedTotal = totalSalesData.length > 0 ? totalSalesData[0].totalSales : 0;
//         console.log("Expected Total Sales from Match Conditions:", expectedTotal);

//         // Log raw orders for debugging
//         const rawOrders = await Order.find(matchConditions).select("createdAt totalAmount paymentMethod");
//         console.log("Raw Orders:", rawOrders.map(order => ({
//             createdAt: order.createdAt,
//             totalAmount: order.totalAmount,
//             paymentMethod: order.paymentMethod,
//             dayOfWeek: order.createdAt.getDay() // JS: 0=Sun, 6=Sat
//         })));

//         // Bar Chart Data
//         if (filter === "weekly") {
//             const weeklyData = await Order.aggregate([
//                 { $match: matchConditions },
//                 { $group: { _id: { $dayOfWeek: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } }, // MongoDB: 1=Sun, 7=Sat
//             ]);
//             console.log("Weekly Bar Data:", weeklyData);
//             const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
//             barLabels = days;
//             barSales = Array(7).fill(0);
//             weeklyData.forEach(item => {
//                 const mongoDay = item._id; // MongoDB: 1=Sun, 7=Sat
//                 const chartDayIndex = mongoDay === 7 ? 0 : mongoDay ; // Map to Sat-Fri (0=Sat, 1=Sun)
//                 barSales[chartDayIndex] = item.totalSales || 0;
//             });
//             const barTotal = barSales.reduce((sum, val) => sum + val, 0);
//             console.log("Bar Chart Total:", barTotal);
//             if (barTotal !== expectedTotal) {
//                 console.warn("Bar Chart Total does not match Expected Total:", { barTotal, expectedTotal });
//             }
//         } else if (filter === "monthly") {
//             const monthlyData = await Order.aggregate([
//                 { $match: matchConditions },
//                 { $group: { _id: { $dayOfMonth: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } },
//             ]);
//             console.log("Monthly Bar Data:", monthlyData);
//             barLabels = monthlyData.map(item => `Day ${item._id}`) || [];
//             barSales = monthlyData.map(item => item.totalSales || 0);
//         }

//         // Pie Chart Data
//         const paymentData = await Order.aggregate([
//             { $match: matchConditions },
//             { $group: { _id: "$paymentMethod", totalSales: { $sum: "$totalAmount" } } },
//         ]);
//         console.log("Pie Data:", paymentData);
//         pieLabels = paymentData.map(item => item._id || "Unknown");
//         pieSales = paymentData.map(item => item.totalSales || 0);
//         const pieTotal = pieSales.reduce((sum, val) => sum + val, 0);
//         console.log("Pie Chart Total:", pieTotal);
//         if (pieTotal !== expectedTotal) {
//             console.warn("Pie Chart Total does not match Expected Total:", { pieTotal, expectedTotal });
//         }

//         // Line Chart Data
//         if (filter === "weekly") {
//             const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
//             lineLabels = days;

//             const currentWeekData = await Order.aggregate([
//                 { $match: matchConditions },
//                 { $group: { _id: { $dayOfWeek: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } }, // MongoDB: 1=Sun, 7=Sat
//             ]);
//             console.log("Current Week Data:", currentWeekData);

//             const startOfPreviousWeek = new Date(startOfWeek);
//             startOfPreviousWeek.setDate(startOfWeek.getDate() - 7);
//             const endOfPreviousWeek = new Date(startOfPreviousWeek);
//             endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 6);
//             endOfPreviousWeek.setHours(23, 59, 59, 999);
//             const previousWeekData = await Order.aggregate([
//                 { $match: { status: "Delivered", createdAt: { $gte: startOfPreviousWeek, $lte: endOfPreviousWeek } } },
//                 { $group: { _id: { $dayOfWeek: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } },
//             ]);
//             console.log("Previous Week Data:", previousWeekData);

//             currentWeekSales = Array(7).fill(0);
//             previousWeekSales = Array(7).fill(0);

//             currentWeekData.forEach(item => {
//                 const mongoDay = item._id;
//                 const chartDayIndex = mongoDay === 7 ? 0 : mongoDay  ;
//                 currentWeekSales[chartDayIndex] = item.totalSales || 0;
//             });

//             previousWeekData.forEach(item => {
//                 const mongoDay = item._id;
//                 const chartDayIndex = mongoDay === 7 ? 0 : mongoDay ;
//                 previousWeekSales[chartDayIndex] = item.totalSales || 0;
//             });

//             const currentWeekTotal = currentWeekSales.reduce((sum, val) => sum + val, 0);
//             console.log("Current Week Total:", currentWeekTotal);
//             if (currentWeekTotal !== expectedTotal) {
//                 console.warn("Current Week Total does not match Expected Total:", { currentWeekTotal, expectedTotal });
//             }
//         } else if (filter === "monthly") {
//             const startOfMonth = new Date(currentYear, currentMonth, 1);
//             const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
//             endOfMonth.setHours(23, 59, 59, 999);

//             if (lineFilter === "week") {
//                 const weeksInMonth = [];
//                 let currentWeekStart = new Date(startOfMonth);
//                 currentWeekStart.setDate(startOfMonth.getDate() - ((currentWeekStart.getDay() + 1) % 7));
//                 currentWeekStart.setHours(0, 0, 0, 0);

//                 while (currentWeekStart <= endOfMonth) {
//                     const weekEnd = new Date(currentWeekStart);
//                     weekEnd.setDate(currentWeekStart.getDate() + 6);
//                     weekEnd.setHours(23, 59, 59, 999);

//                     const adjustedStart = currentWeekStart < startOfMonth ? startOfMonth : currentWeekStart;
//                     const adjustedEnd = weekEnd > endOfMonth ? endOfMonth : weekEnd;

//                     weeksInMonth.push({ start: new Date(adjustedStart), end: new Date(adjustedEnd) });
//                     currentWeekStart.setDate(currentWeekStart.getDate() + 7);
//                 }

//                 console.log("Weeks in Month:", weeksInMonth);

//                 lineLabels = weeksInMonth.map((week, i) => {
//                     const startStr = week.start.toISOString().split("T")[0];
//                     const endStr = week.end.toISOString().split("T")[0];
//                     return `Week ${i + 1} (${startStr} to ${endStr})`;
//                 });

//                 const weeklyData = await Promise.all(
//                     weeksInMonth.map(async (week) => {
//                         const data = await Order.aggregate([
//                             {
//                                 $match: {
//                                     status: "Delivered",
//                                     createdAt: { $gte: week.start, $lte: week.end }
//                                 }
//                             },
//                             { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
//                         ]);
//                         return data.length > 0 ? data[0].totalSales : 0;
//                     })
//                 );
//                 console.log("Monthly Weekly Line Data:", weeklyData);
//                 lineSales = weeklyData;
//             } else if (lineFilter === "day") {
//                 const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
//                 lineLabels = Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`);
//                 const dailyData = await Order.aggregate([
//                     { $match: matchConditions },
//                     { $group: { _id: { $dayOfMonth: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                     { $sort: { _id: 1 } },
//                 ]);
//                 console.log("Monthly Daily Line Data:", dailyData);
//                 lineSales = lineLabels.map((_, i) => dailyData.find(d => d._id === i + 1)?.totalSales || 0);
//             }
//         }

//         const responseData = {
//             barChart: { labels: barLabels, sales: barSales },
//             pieChart: { labels: pieLabels, sales: pieSales },
//             lineChart: {
//                 labels: lineLabels,
//                 sales: lineSales,
//                 currentWeekSales,
//                 previousWeekSales,
//             },
//         };

//         console.log("Response Data:", responseData);
//         res.json(responseData);
//     } catch (error) {
//         console.error("Error generating chart data:", error);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

// export const chart = async (req, res) => {
//     try {
//         const { filter, month, year, startDate, endDate, lineFilter = "week" } = req.query;

//         const now = new Date(); // Current date and time (e.g., March 09, 2025)
//         const currentMonth = month ? parseInt(month) - 1 : now.getMonth();
//         const currentYear = year ? parseInt(year) : now.getFullYear();

//         let matchConditions = { status: "Delivered" };
//         let startOfWeek, endOfWeek;

//         console.log("Query Parameters:", req.query);

//         // Set match conditions based on filter
//         if (filter === "daily") {
//             matchConditions.createdAt = {
//                 $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
//                 $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
//             };
//         } else if (filter === "weekly") {
//             startOfWeek = new Date(now);
//             startOfWeek.setDate(now.getDate() - ((now.getDay() + 1) % 7)); // Start at Saturday
//             startOfWeek.setHours(0, 0, 0, 0);
//             endOfWeek = new Date(now); // Include up to current time
//             matchConditions.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
//         } else if (filter === "monthly") {
//             matchConditions.createdAt = {
//                 $gte: new Date(currentYear, currentMonth, 1),
//                 $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999),
//             };
//         } else if (filter === "yearly") {
//             matchConditions.createdAt = {
//                 $gte: new Date(currentYear, 0, 1),
//                 $lte: new Date(currentYear, 11, 31, 23, 59, 59, 999),
//             };
//         } else if (filter === "custom" && startDate && endDate) {
//             const start = new Date(startDate);
//             const end = new Date(endDate);
//             if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//                 return res.status(400).json({ success: false, message: "Invalid date format" });
//             }
//             if (start > end) {
//                 return res.status(400).json({ success: false, message: "Start date must be before end date" });
//             }
//             end.setHours(23, 59, 59, 999);
//             matchConditions.createdAt = { $gte: start, $lte: end };
//         } else {
//             return res.status(400).json({ success: false, message: "Invalid or missing filter parameter" });
//         }

//         console.log("Match Conditions:", matchConditions);

//         // Declare all variables at the top
//         let barLabels = [];
//         let barSales = [];
//         let pieLabels = [];
//         let pieSales = [];
//         let lineLabels = [];
//         let lineSales = [];
//         let currentWeekSales = [];
//         let previousWeekSales = [];

//         // Calculate total sales first to ensure consistency
//         const totalSalesData = await Order.aggregate([
//             { $match: matchConditions },
//             { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
//         ]);
//         const expectedTotal = totalSalesData.length > 0 ? totalSalesData[0].totalSales : 0;
//         console.log("Expected Total Sales from Match Conditions:", expectedTotal);

//         // Log raw orders for debugging
//         const rawOrders = await Order.find(matchConditions).select("createdAt totalAmount paymentMethod");
//         console.log("Raw Orders:", rawOrders.map(order => ({
//             createdAt: order.createdAt,
//             totalAmount: order.totalAmount,
//             paymentMethod: order.paymentMethod,
//             dayOfWeek: order.createdAt.getDay() // JS: 0=Sun, 6=Sat
//         })));

//         // Bar Chart Data
//         if (filter === "weekly") {
//             const weeklyData = await Order.aggregate([
//                 { $match: matchConditions },
//                 { $group: { _id: { $dayOfWeek: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } }, // MongoDB: 1=Sun, 7=Sat
//             ]);
//             console.log("Weekly Bar Data:", weeklyData);
//             const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
//             barLabels = days;
//             barSales = Array(7).fill(0);
//             weeklyData.forEach(item => {
//                 const mongoDay = item._id; // MongoDB: 1=Sun, 7=Sat
//                 const chartDayIndex = mongoDay === 7 ? 0 : mongoDay; // Map to Sat-Fri (0=Sat, 1=Sun)
//                 barSales[chartDayIndex] = item.totalSales || 0;
//             });
//             const barTotal = barSales.reduce((sum, val) => sum + val, 0);
//             console.log("Bar Chart Total:", barTotal);
//             if (barTotal !== expectedTotal) {
//                 console.warn("Bar Chart Total does not match Expected Total:", { barTotal, expectedTotal });
//             }
//         } else if (filter === "monthly") {
//             const monthlyData = await Order.aggregate([
//                 { $match: matchConditions },
//                 { $group: { _id: { $dayOfMonth: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } },
//             ]);
//             console.log("Monthly Bar Data:", monthlyData);
//             barLabels = monthlyData.map(item => `Day ${item._id}`);
//             barSales = monthlyData.map(item => item.totalSales || 0);
//         } else if (filter === "yearly") {
//             const yearlyBarData = await Order.aggregate([
//                 { $match: matchConditions },
//                 { $group: { _id: { $month: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } },
//             ]);
//             console.log("Yearly Bar Data:", yearlyBarData);
//             const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//             barLabels = monthNames;
//             barSales = Array(12).fill(0);
//             yearlyBarData.forEach(item => {
//                 barSales[item._id - 1] = item.totalSales || 0; // _id is 1-12 (Jan-Dec)
//             });
//             const barTotal = barSales.reduce((sum, val) => sum + val, 0);
//             console.log("Bar Chart Total (Yearly):", barTotal);
//             if (barTotal !== expectedTotal) {
//                 console.warn("Bar Chart Total does not match Expected Total:", { barTotal, expectedTotal });
//             }
//         }

//         // Pie Chart Data
//         const paymentData = await Order.aggregate([
//             { $match: matchConditions },
//             { $group: { _id: "$paymentMethod", totalSales: { $sum: "$totalAmount" } } },
//         ]);
//         console.log("Pie Data:", paymentData);
//         pieLabels = paymentData.map(item => item._id || "Unknown");
//         pieSales = paymentData.map(item => item.totalSales || 0);
//         const pieTotal = pieSales.reduce((sum, val) => sum + val, 0);
//         console.log("Pie Chart Total:", pieTotal);
//         if (pieTotal !== expectedTotal) {
//             console.warn("Pie Chart Total does not match Expected Total:", { pieTotal, expectedTotal });
//         }

//         // Line Chart Data
//         if (filter === "weekly") {
//             const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
//             lineLabels = days;

//             const currentWeekData = await Order.aggregate([
//                 { $match: matchConditions },
//                 { $group: { _id: { $dayOfWeek: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } }, // MongoDB: 1=Sun, 7=Sat
//             ]);
//             console.log("Current Week Data:", currentWeekData);

//             const startOfPreviousWeek = new Date(startOfWeek);
//             startOfPreviousWeek.setDate(startOfWeek.getDate() - 7);
//             const endOfPreviousWeek = new Date(startOfPreviousWeek);
//             endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 6);
//             endOfPreviousWeek.setHours(23, 59, 59, 999);
//             const previousWeekData = await Order.aggregate([
//                 { $match: { status: "Delivered", createdAt: { $gte: startOfPreviousWeek, $lte: endOfPreviousWeek } } },
//                 { $group: { _id: { $dayOfWeek: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                 { $sort: { _id: 1 } },
//             ]);
//             console.log("Previous Week Data:", previousWeekData);

//             currentWeekSales = Array(7).fill(0);
//             previousWeekSales = Array(7).fill(0);

//             currentWeekData.forEach(item => {
//                 const mongoDay = item._id;
//                 const chartDayIndex = mongoDay === 7 ? 0 : mongoDay;
//                 currentWeekSales[chartDayIndex] = item.totalSales || 0;
//             });

//             previousWeekData.forEach(item => {
//                 const mongoDay = item._id;
//                 const chartDayIndex = mongoDay === 7 ? 0 : mongoDay;
//                 previousWeekSales[chartDayIndex] = item.totalSales || 0;
//             });

//             const currentWeekTotal = currentWeekSales.reduce((sum, val) => sum + val, 0);
//             console.log("Current Week Total:", currentWeekTotal);
//             if (currentWeekTotal !== expectedTotal) {
//                 console.warn("Current Week Total does not match Expected Total:", { currentWeekTotal, expectedTotal });
//             }
//         } else if (filter === "monthly") {
//             const startOfMonth = new Date(currentYear, currentMonth, 1);
//             const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
//             endOfMonth.setHours(23, 59, 59, 999);

//             if (lineFilter === "week") {
//                 const weeksInMonth = [];
//                 let currentWeekStart = new Date(startOfMonth);
//                 currentWeekStart.setDate(startOfMonth.getDate() - ((currentWeekStart.getDay() + 1) % 7));
//                 currentWeekStart.setHours(0, 0, 0, 0);

//                 while (currentWeekStart <= endOfMonth) {
//                     const weekEnd = new Date(currentWeekStart);
//                     weekEnd.setDate(currentWeekStart.getDate() + 6);
//                     weekEnd.setHours(23, 59, 59, 999);

//                     const adjustedStart = currentWeekStart < startOfMonth ? startOfMonth : currentWeekStart;
//                     const adjustedEnd = weekEnd > endOfMonth ? endOfMonth : weekEnd;

//                     weeksInMonth.push({ start: new Date(adjustedStart), end: new Date(adjustedEnd) });
//                     currentWeekStart.setDate(currentWeekStart.getDate() + 7);
//                 }

//                 console.log("Weeks in Month:", weeksInMonth);

//                 lineLabels = weeksInMonth.map((week, i) => {
//                     const startStr = week.start.toISOString().split("T")[0];
//                     const endStr = week.end.toISOString().split("T")[0];
//                     return `Week ${i + 1} (${startStr} to ${endStr})`;
//                 });

//                 const weeklyData = await Promise.all(
//                     weeksInMonth.map(async (week) => {
//                         const data = await Order.aggregate([
//                             {
//                                 $match: {
//                                     status: "Delivered",
//                                     createdAt: { $gte: week.start, $lte: week.end }
//                                 }
//                             },
//                             { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
//                         ]);
//                         return data.length > 0 ? data[0].totalSales : 0;
//                     })
//                 );
//                 console.log("Monthly Weekly Line Data:", weeklyData);
//                 lineSales = weeklyData;
//             } else if (lineFilter === "day") {
//                 const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
//                 lineLabels = Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`);
//                 const dailyData = await Order.aggregate([
//                     { $match: matchConditions },
//                     { $group: { _id: { $dayOfMonth: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
//                     { $sort: { _id: 1 } },
//                 ]);
//                 console.log("Monthly Daily Line Data:", dailyData);
//                 lineSales = lineLabels.map((_, i) => dailyData.find(d => d._id === i + 1)?.totalSales || 0);
//             }
//         } else if (filter === "yearly") {
//             const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//             lineLabels = monthNames;
//             lineSales = barSales; // Reuse barSales since it’s monthly data for the year
//             const lineTotal = lineSales.reduce((sum, val) => sum + val, 0);
//             console.log("Line Chart Total (Yearly):", lineTotal);
//         }

//         const responseData = {
//             barChart: { labels: barLabels, sales: barSales },
//             pieChart: { labels: pieLabels, sales: pieSales },
//             lineChart: {
//                 labels: lineLabels,
//                 sales: lineSales,
//                 currentWeekSales,
//                 previousWeekSales,
//             },
//         };

//         console.log("Response Data:", responseData);
//         res.json(responseData);
//     } catch (error) {
//         console.error("Error generating chart data:", error);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

export const chart = async (req, res) => {
  try {
    const {
      filter,
      month,
      year,
      startDate,
      endDate,
      lineFilter = "week",
    } = req.query;

    const now = new Date(); // Current date and time (e.g., March 10, 2025)
    const currentMonth = month ? parseInt(month) - 1 : now.getMonth();
    const currentYear = year ? parseInt(year) : now.getFullYear();

    let matchConditions = { status: "Delivered" };
    let startOfWeek, endOfWeek, startDateObj, endDateObj;

    console.log("Query Parameters:", req.query);

    // Set match conditions based on filter
    if (filter === "daily") {
      matchConditions.createdAt = {
        $gte: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0
        ),
        $lte: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        ),
      };
    } else if (filter === "weekly") {
      startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((now.getDay() + 1) % 7)); // Start at Saturday
      startOfWeek.setHours(0, 0, 0, 0);
      endOfWeek = new Date(now); // Include up to current time
      matchConditions.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (filter === "monthly") {
      matchConditions.createdAt = {
        $gte: new Date(currentYear, currentMonth, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999),
      };
    } else if (filter === "yearly") {
      matchConditions.createdAt = {
        $gte: new Date(currentYear, 0, 1),
        $lte: new Date(currentYear, 11, 31, 23, 59, 59, 999),
      };
    } else if (filter === "custom" && startDate && endDate) {
      startDateObj = new Date(startDate);
      endDateObj = new Date(endDate);
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid date format" });
      }
      if (startDateObj > endDateObj) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Start date must be before end date",
          });
      }
      endDateObj.setHours(23, 59, 59, 999);
      matchConditions.createdAt = { $gte: startDateObj, $lte: endDateObj };
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid or missing filter parameter",
        });
    }

    console.log("Match Conditions:", matchConditions);

  
    let barLabels = [];
    let barSales = [];
    let pieLabels = [];
    let pieSales = [];
    let lineLabels = [];
    let lineSales = [];
    let currentWeekSales = [];
    let previousWeekSales = [];

    // Calculate total sales first to ensure consistency
    const totalSalesData = await Order.aggregate([
      { $match: matchConditions },
      { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
    ]);
    const expectedTotal =
      totalSalesData.length > 0 ? totalSalesData[0].totalSales : 0;
    console.log("Expected Total Sales from Match Conditions:", expectedTotal);

    // Log raw orders for debugging
    const rawOrders = await Order.find(matchConditions).select(
      "createdAt totalAmount paymentMethod"
    );
    console.log(
      "Raw Orders:",
      rawOrders.map((order) => ({
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        dayOfWeek: order.createdAt.getDay(), // JS: 0=Sun, 6=Sat
      }))
    );

    // Bar Chart Data
    if (filter === "daily") {
      const dailyData = await Order.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } }, // Sort by hour (0-23)
      ]);
      console.log("Daily Bar Data:", dailyData);
      barLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      barSales = Array(24).fill(0);
      dailyData.forEach((item) => {
        barSales[item._id] = item.totalSales || 0;
      });
      const barTotal = barSales.reduce((sum, val) => sum + val, 0);
      console.log("Bar Chart Total (Daily):", barTotal);
      if (barTotal !== expectedTotal) {
        console.warn("Bar Chart Total does not match Expected Total:", {
          barTotal,
          expectedTotal,
        });
      }
    } else if (filter === "weekly") {
      const weeklyData = await Order.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } }, 
      ]);
      console.log("Weekly Bar Data:", weeklyData);
      const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
      barLabels = days;
      barSales = Array(7).fill(0);
      weeklyData.forEach((item) => {
        const mongoDay = item._id; 
        const chartDayIndex = mongoDay === 7 ? 0 : mongoDay; 
        barSales[chartDayIndex] = item.totalSales || 0;
      });
      const barTotal = barSales.reduce((sum, val) => sum + val, 0);
      console.log("Bar Chart Total:", barTotal);
      if (barTotal !== expectedTotal) {
        console.warn("Bar Chart Total does not match Expected Total:", {
          barTotal,
          expectedTotal,
        });
      }
    } else if (filter === "monthly") {
      const monthlyData = await Order.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      console.log("Monthly Bar Data:", monthlyData);
      barLabels = monthlyData.map((item) => `Day ${item._id}`);
      barSales = monthlyData.map((item) => item.totalSales || 0);
    } else if (filter === "yearly") {
      const yearlyBarData = await Order.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      console.log("Yearly Bar Data:", yearlyBarData);
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      barLabels = monthNames;
      barSales = Array(12).fill(0);
      yearlyBarData.forEach((item) => {
        barSales[item._id - 1] = item.totalSales || 0; 
      });
      const barTotal = barSales.reduce((sum, val) => sum + val, 0);
      console.log("Bar Chart Total (Yearly):", barTotal);
      if (barTotal !== expectedTotal) {
        console.warn("Bar Chart Total does not match Expected Total:", {
          barTotal,
          expectedTotal,
        });
      }
    } else if (filter === "custom") {
      const daysDiff = Math.ceil(
        (endDateObj - startDateObj) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 7) {
    
        const customData = await Order.aggregate([
          { $match: matchConditions },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              totalSales: { $sum: "$totalAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        console.log("Custom Bar Data (Daily):", customData);
        barLabels = customData.map((item) => item._id);
        barSales = customData.map((item) => item.totalSales || 0);
      } else if (daysDiff <= 31) {
        // Weekly aggregation for medium ranges
        const weeksInRange = [];
        let currentWeekStart = new Date(startDateObj);
        currentWeekStart.setDate(
          startDateObj.getDate() - ((currentWeekStart.getDay() + 1) % 7)
        );
        currentWeekStart.setHours(0, 0, 0, 0);

        while (currentWeekStart <= endDateObj) {
          const weekEnd = new Date(currentWeekStart);
          weekEnd.setDate(currentWeekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          const adjustedStart =
            currentWeekStart < startDateObj ? startDateObj : currentWeekStart;
          const adjustedEnd = weekEnd > endDateObj ? endDateObj : weekEnd;

          weeksInRange.push({
            start: new Date(adjustedStart),
            end: new Date(adjustedEnd),
          });
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }

        console.log("Weeks in Custom Range:", weeksInRange);

        barLabels = weeksInRange.map((week, i) => {
          const startStr = week.start.toISOString().split("T")[0];
          const endStr = week.end.toISOString().split("T")[0];
          return `Week ${i + 1} (${startStr} to ${endStr})`;
        });

        const weeklyData = await Promise.all(
          weeksInRange.map(async (week) => {
            const data = await Order.aggregate([
              {
                $match: {
                  status: "Delivered",
                  createdAt: { $gte: week.start, $lte: week.end },
                },
              },
              { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
            ]);
            return data.length > 0 ? data[0].totalSales : 0;
          })
        );
        console.log("Custom Bar Data (Weekly):", weeklyData);
        barSales = weeklyData;
      } else {
        // Monthly aggregation for long ranges
        const customData = await Order.aggregate([
          { $match: matchConditions },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              totalSales: { $sum: "$totalAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        console.log("Custom Bar Data (Monthly):", customData);
        barLabels = customData.map((item) => item._id);
        barSales = customData.map((item) => item.totalSales || 0);
      }
      const barTotal = barSales.reduce((sum, val) => sum + val, 0);
      console.log("Bar Chart Total (Custom):", barTotal);
      if (barTotal !== expectedTotal) {
        console.warn("Bar Chart Total does not match Expected Total:", {
          barTotal,
          expectedTotal,
        });
      }
    }

    // Pie Chart Data
    const paymentData = await Order.aggregate([
      { $match: matchConditions },
      {
        $group: { _id: "$paymentMethod", totalSales: { $sum: "$totalAmount" } },
      },
    ]);
    console.log("Pie Data:", paymentData);
    pieLabels = paymentData.map((item) => item._id || "Unknown");
    pieSales = paymentData.map((item) => item.totalSales || 0);
    const pieTotal = pieSales.reduce((sum, val) => sum + val, 0);
    console.log("Pie Chart Total:", pieTotal);
    if (pieTotal !== expectedTotal) {
      console.warn("Pie Chart Total does not match Expected Total:", {
        pieTotal,
        expectedTotal,
      });
    }

    // Line Chart Data
    if (filter === "daily") {
      const dailyData = await Order.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      console.log("Daily Line Data:", dailyData);
      lineLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      lineSales = Array(24).fill(0);
      dailyData.forEach((item) => {
        lineSales[item._id] = item.totalSales || 0;
      });
    } else if (filter === "weekly") {
      const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
      lineLabels = days;

      const currentWeekData = await Order.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } }, 
      ]);
      console.log("Current Week Data:", currentWeekData);

      const startOfPreviousWeek = new Date(startOfWeek);
      startOfPreviousWeek.setDate(startOfWeek.getDate() - 7);
      const endOfPreviousWeek = new Date(startOfPreviousWeek);
      endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 6);
      endOfPreviousWeek.setHours(23, 59, 59, 999);
      const previousWeekData = await Order.aggregate([
        {
          $match: {
            status: "Delivered",
            createdAt: { $gte: startOfPreviousWeek, $lte: endOfPreviousWeek },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            totalSales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      console.log("Previous Week Data:", previousWeekData);

      currentWeekSales = Array(7).fill(0);
      previousWeekSales = Array(7).fill(0);

      currentWeekData.forEach((item) => {
        const mongoDay = item._id;
        const chartDayIndex = mongoDay === 7 ? 0 : mongoDay;
        currentWeekSales[chartDayIndex] = item.totalSales || 0;
      });

      previousWeekData.forEach((item) => {
        const mongoDay = item._id;
        const chartDayIndex = mongoDay === 7 ? 0 : mongoDay;
        previousWeekSales[chartDayIndex] = item.totalSales || 0;
      });

      const currentWeekTotal = currentWeekSales.reduce(
        (sum, val) => sum + val,
        0
      );
      console.log("Current Week Total:", currentWeekTotal);
      if (currentWeekTotal !== expectedTotal) {
        console.warn("Current Week Total does not match Expected Total:", {
          currentWeekTotal,
          expectedTotal,
        });
      }
    } else if (filter === "monthly") {
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      if (lineFilter === "week") {
        const weeksInMonth = [];
        let currentWeekStart = new Date(startOfMonth);
        currentWeekStart.setDate(
          startOfMonth.getDate() - ((currentWeekStart.getDay() + 1) % 7)
        );
        currentWeekStart.setHours(0, 0, 0, 0);

        while (currentWeekStart <= endOfMonth) {
          const weekEnd = new Date(currentWeekStart);
          weekEnd.setDate(currentWeekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          const adjustedStart =
            currentWeekStart < startOfMonth ? startOfMonth : currentWeekStart;
          const adjustedEnd = weekEnd > endOfMonth ? endOfMonth : weekEnd;

          weeksInMonth.push({
            start: new Date(adjustedStart),
            end: new Date(adjustedEnd),
          });
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }

        console.log("Weeks in Month:", weeksInMonth);

        lineLabels = weeksInMonth.map((week, i) => {
          const startStr = week.start.toISOString().split("T")[0];
          const endStr = week.end.toISOString().split("T")[0];
          return `Week ${i + 1} (${startStr} to ${endStr})`;
        });

        const weeklyData = await Promise.all(
          weeksInMonth.map(async (week) => {
            const data = await Order.aggregate([
              {
                $match: {
                  status: "Delivered",
                  createdAt: { $gte: week.start, $lte: week.end },
                },
              },
              { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
            ]);
            return data.length > 0 ? data[0].totalSales : 0;
          })
        );
        console.log("Monthly Weekly Line Data:", weeklyData);
        lineSales = weeklyData;
      } else if (lineFilter === "day") {
        const daysInMonth = new Date(
          currentYear,
          currentMonth + 1,
          0
        ).getDate();
        lineLabels = Array.from(
          { length: daysInMonth },
          (_, i) => `Day ${i + 1}`
        );
        const dailyData = await Order.aggregate([
          { $match: matchConditions },
          {
            $group: {
              _id: { $dayOfMonth: "$createdAt" },
              totalSales: { $sum: "$totalAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        console.log("Monthly Daily Line Data:", dailyData);
        lineSales = lineLabels.map(
          (_, i) => dailyData.find((d) => d._id === i + 1)?.totalSales || 0
        );
      }
    } else if (filter === "yearly") {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      lineLabels = monthNames;
      lineSales = barSales; 
      const lineTotal = lineSales.reduce((sum, val) => sum + val, 0);
      console.log("Line Chart Total (Yearly):", lineTotal);
    } else if (filter === "custom") {
      const daysDiff = Math.ceil(
        (endDateObj - startDateObj) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 7) {
        
        const customData = await Order.aggregate([
          { $match: matchConditions },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              totalSales: { $sum: "$totalAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        console.log("Custom Line Data (Daily):", customData);
        lineLabels = customData.map((item) => item._id);
        lineSales = customData.map((item) => item.totalSales || 0);
      } else if (daysDiff <= 31) {
       
        const weeksInRange = [];
        let currentWeekStart = new Date(startDateObj);
        currentWeekStart.setDate(
          startDateObj.getDate() - ((currentWeekStart.getDay() + 1) % 7)
        );
        currentWeekStart.setHours(0, 0, 0, 0);

        while (currentWeekStart <= endDateObj) {
          const weekEnd = new Date(currentWeekStart);
          weekEnd.setDate(currentWeekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          const adjustedStart =
            currentWeekStart < startDateObj ? startDateObj : currentWeekStart;
          const adjustedEnd = weekEnd > endDateObj ? endDateObj : weekEnd;

          weeksInRange.push({
            start: new Date(adjustedStart),
            end: new Date(adjustedEnd),
          });
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }

        console.log("Weeks in Custom Range (Line):", weeksInRange);

        lineLabels = weeksInRange.map((week, i) => {
          const startStr = week.start.toISOString().split("T")[0];
          const endStr = week.end.toISOString().split("T")[0];
          return `Week ${i + 1} (${startStr} to ${endStr})`;
        });

        const weeklyData = await Promise.all(
          weeksInRange.map(async (week) => {
            const data = await Order.aggregate([
              {
                $match: {
                  status: "Delivered",
                  createdAt: { $gte: week.start, $lte: week.end },
                },
              },
              { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
            ]);
            return data.length > 0 ? data[0].totalSales : 0;
          })
        );
        console.log("Custom Line Data (Weekly):", weeklyData);
        lineSales = weeklyData;
      } else {
        
        const customData = await Order.aggregate([
          { $match: matchConditions },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              totalSales: { $sum: "$totalAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        console.log("Custom Line Data (Monthly):", customData);
        lineLabels = customData.map((item) => item._id);
        lineSales = customData.map((item) => item.totalSales || 0);
      }
    }

    const responseData = {
      barChart: { labels: barLabels, sales: barSales },
      pieChart: { labels: pieLabels, sales: pieSales },
      lineChart: {
        labels: lineLabels,
        sales: lineSales,
        currentWeekSales,
        previousWeekSales,
      },
    };

    console.log("Response Data:", responseData);
    res.json(responseData);
  } catch (error) {
    console.error("Error generating chart data:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const ledger = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const totalOrders = await Order.countDocuments({});
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find({})
      .populate("addressId")
      .populate("appliedCoupon")
      .skip((page - 1) * limit)
      .limit(limit);

    let totalIncome = 0;
    let totalDiscount = 0;
    let totalRefund = 0;

    const ledgerData = orders.map((order) => {
      let totalAmount = parseFloat(order.totalAmount) || 0;
      let refundedAmount = parseFloat(order.refundedAmount) || 0;
      let couponDiscount = 0;

      if (order.appliedCoupon && order.appliedCoupon.value) {
        const discountValue = parseFloat(order.appliedCoupon.value) || 0;

        if (order.appliedCoupon.discountType === "percentage") {
          couponDiscount = (totalAmount * discountValue) / 100;
        } else if (order.appliedCoupon.discountType === "flat") {
          couponDiscount = discountValue;
        }
      }

      totalIncome += totalAmount;
      totalDiscount += couponDiscount;
      totalRefund += refundedAmount;

      return {
        orderId: order._id,
        customer: order.addressId?.fullName || "N/A",
        date: order.createdAt
          ? new Date(order.createdAt).toLocaleDateString()
          : "N/A",
        paymentMethod: order.paymentMethod || "N/A",
        totalAmount: totalAmount.toFixed(2),
        discount: couponDiscount.toFixed(2),
        refund: refundedAmount.toFixed(2),
        profit: (totalAmount - couponDiscount - refundedAmount).toFixed(2),
      };
    });

    const totalProfit = (totalIncome - totalDiscount - totalRefund).toFixed(2);

    res.render("admin/ledger", {
      ledgerData,
      page,
      totalPages,
      limit,
      totalIncome: totalIncome.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      totalRefund: totalRefund.toFixed(2),
      totalProfit,
    });
  } catch (error) {
    console.error("Error generating ledger:", error);
    res.status(500).send("Failed to load ledger data");
  }
};
