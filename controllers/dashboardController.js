
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import Chart from "chart.js/auto";
import { DateTime } from "luxon";



import Order from '../models/order.js'; 
import Product from '../models/products.js';

export const salesreportget = async (req, res) => {
    try {
        const { filter, startDate, endDate, format } = req.query;

        if (!format) {
            return res.status(400).json({ message: "Format parameter is required" });
        }

        const fileFormat = format.toLowerCase();
        if (!["excel", "pdf", "json"].includes(fileFormat)) {
            return res.status(400).json({ message: "Invalid format specified. Use excel, pdf, or json" });
        }

        let matchCondition = { status: "Delivered" };
        const now = new Date();

        if (filter === "daily") {
            matchCondition.createdAt = {
                $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            };
        } else if (filter === "weekly") {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            matchCondition.createdAt = { $gte: startOfWeek };
        } else if (filter === "monthly") {
            matchCondition.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
        } else if (filter === "yearly") {
            matchCondition.createdAt = { $gte: new Date(now.getFullYear(), 0, 1) };
        } else if (filter === "custom" && startDate && endDate) {
            matchCondition.createdAt = {
                $gte: new Date(startDate),
                $lt: new Date(endDate),
            };
        }

        const orders = await Order.find(matchCondition).populate("userId", "fname lname").populate("appliedCoupon").populate({
            path: 'items.productId',
            model: 'Product'
        });

        if (!orders.length) {
            return res.status(404).json({ message: "No orders found for the selected filter" });
        }

        const pendingOrdersCount = await Order.countDocuments({ status: "Pending" });
        const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalOrders = orders.length;
        const totalProductsSold = orders.reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0);
        const totalUsers = new Set(orders.map(order => order.userId?._id.toString())).size;

        // Calculate total discounts
        const totalDiscount = orders.reduce((sum, order) => {
            return sum + order.items.reduce((discountSum, item) => {
                const product = item.productId;
                const itemDiscount = product.isOfferActive ? (product.price - product.Offerprice) * item.quantity : 0;
                return discountSum + itemDiscount;
            }, 0);
        }, 0);

        const totalCouponDiscount = orders.reduce((sum, order) => {
            if (order.appliedCoupon) {
                const coupon = order.appliedCoupon;
                const itemTotal = order.items.reduce((sum, item) => sum + item.totalprice * item.quantity, 0);
                if (coupon.discountType === 'percentage') {
                    return sum + (itemTotal * (coupon.value / 100));
                } else if (coupon.discountType === 'flat') {
                    return sum + coupon.value;
                }
            }
            return sum;
        }, 0);

        const totalAllDiscount = totalDiscount + totalCouponDiscount;
        const totalCollection = totalSales - totalAllDiscount;

        const salesData = orders.map(order => {
            const itemTotal = order.items.reduce((sum, item) => sum + item.totalprice * item.quantity, 0);
            const discountAmount = order.items.reduce((sum, item) => {
                const product = item.productId;
                const itemDiscount = product.isOfferActive ? (product.price - product.Offerprice) * item.quantity : 0;
                return sum + itemDiscount;
            }, 0);
            const couponDiscount = order.appliedCoupon ? (order.appliedCoupon.discountType === 'percentage' ? (itemTotal * (order.appliedCoupon.value / 100)) : order.appliedCoupon.value) : 0;
            const finalAmount = order.totalAmount;

            return {
                "Order ID": order._id.toString(),
                "Date": order.createdAt.toISOString().split("T")[0],
                "Total Items": order.items.reduce((sum, item) => sum + item.quantity, 0),
                "Total Amount": `${itemTotal.toFixed(2)}`,
                "Discount Applied": `${discountAmount.toFixed(2)}`,
                "Coupon Discount": `${couponDiscount.toFixed(2)}`,
                "Final Amount": `${finalAmount.toFixed(2)}`,
                "Payment Method": order.paymentMethod,
                "Order Status": order.status,
               
            };
        });

        const pdfFormatData = orders.map(order => {
            const itemTotal = order.items.reduce((sum, item) => sum + item.totalprice * item.quantity, 0);
            const discountAmount = order.items.reduce((sum, item) => {
                const product = item.productId;
                const itemDiscount = product.isOfferActive ? (product.price - product.Offerprice) * item.quantity : 0;
                return sum + itemDiscount;
            }, 0);
            const couponDiscount = order.appliedCoupon ? (order.appliedCoupon.discountType === 'percentage' ? (itemTotal * (order.appliedCoupon.value / 100)) : order.appliedCoupon.value) : 0;
            const finalAmount = order.totalAmount;

            return {
                "Order ID": order._id.toString().substring(0, 9) + "...",
                "Date": order.createdAt.toISOString().split("T")[0],
                "Items": order.items.reduce((sum, item) => sum + item.quantity, 0),
                "Total": `${itemTotal.toFixed(2)}`,
                "Discount": `${discountAmount.toFixed(2)}`,
                "Coupon": `${couponDiscount.toFixed(2)}`,
                "Final": `${finalAmount.toFixed(2)}`,
                "Payment": order.paymentMethod,
                "Status": order.status,
               
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
                orders: salesData
            });
        }

        const reportsDir = path.join(process.cwd(), "sales-reports");
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
                ["Order ID", "Date", "Items", "Total", "Offer Discount", "Coupon", "Final", "Payment", "Status"]
            ]);
            pdfFormatData.forEach(order => {
                XLSX.utils.sheet_add_aoa(ws, [[
                    order["Order ID"],
                    order["Date"],
                    order["Items"],
                    order["Total"],
                    order["Discount"],
                    order["Coupon"],
                    order["Final"],
                    order["Payment"],
                    order["Status"]
                ]], { origin: -1 });
            });
            ws['!cols'] = [
                { wch: 15 },
                { wch: 12 },
                { wch: 8 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 20 }
            ];
            const headerStyle = {
                fill: { fgColor: { rgb: "224ABE" } },
                font: { bold: true, color: { rgb: "FFFFFF" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
            const titleStyle = {
                font: { bold: true, sz: 16, color: { rgb: "224ABE" } },
                alignment: { horizontal: "left" }
            };
            const dataStyle = {
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                }
            };
            const deliveredStyle = {
                font: { color: { rgb: "28A745" }, bold: true },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                }
            };
            ws.A1.s = titleStyle;
            for (let i = 0; i < 10; i++) {
                const cell = XLSX.utils.encode_cell({ r: 2, c: i });
                if (!ws[cell]) ws[cell] = { v: "" };
                ws[cell].s = headerStyle;
            }
            for (let i = 0; i < pdfFormatData.length; i++) {
                for (let j = 0; j < 10; j++) {
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
            ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
            XLSX.utils.book_append_sheet(wb, ws, "Order Details");

            // Summary Sheet
            const summaryData = [
                { Metric: "Total Sales", Value: `${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                { Metric: "Total Orders", Value: totalOrders.toString() },
                { Metric: "Total Products Sold", Value: totalProductsSold.toString() },
                { Metric: "Total Users", Value: totalUsers.toString() },
                { Metric: "Total Discount", Value: `${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                { Metric: "Total Coupon Discount", Value: `${totalCouponDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },

            ];
            const summaryWs = XLSX.utils.json_to_sheet(summaryData);
            summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }];

            // Add header styles
            const headerRow = summaryWs["!ref"].split(":")[0];
            for (let col = 1; col <= summaryWs["!cols"].length; col++) {
                const cell = XLSX.utils.encode_cell({ r: parseInt(headerRow.match(/\d+/)[0]) - 1, c: col - 1 });
                if (summaryWs[cell]) {
                    summaryWs[cell].s = headerStyle;
                }
            }

            // Add data styles
            for (let row = 2; row <= summaryWs["!ref"].split(":")[1].match(/\d+/)[0]; row++) {
                for (let col = 1; col <= summaryWs["!cols"].length; col++) {
                    const cell = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
                    if (summaryWs[cell]) {
                        summaryWs[cell].s = dataStyle;
                    }
                }
            }

            XLSX.utils.book_append_sheet(wb, summaryWs, "Sales Summary");

            XLSX.writeFile(wb, filePath, {
                bookType: 'xlsx',
                bookSST: false,
                type: 'binary',
                cellStyles: true
            });

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="VGURIE_Order_Details.xlsx"`);
            return res.download(filePath, () => fs.unlinkSync(filePath));
        }

        if (fileFormat === "pdf") {
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", 'attachment; filename="VGURIE_Sales_Report.pdf"');
            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
                bufferPages: true
            });
            doc.pipe(res);
            let reportTitle = "VGURIE Sales Report";
            let dateRange = "";
            if (filter === "daily") {
                dateRange = `for ${now.toLocaleDateString()}`;
            } else if (filter === "weekly") {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                dateRange = `for week of ${startOfWeek.toLocaleDateString()}`;
            } else if (filter === "monthly") {
                dateRange = `for ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
            } else if (filter === "yearly") {
                dateRange = `for Year ${now.getFullYear()}`;
            } else if (filter === "custom") {
                dateRange = `from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
            }
            doc.rect(50, 50, 150, 50).stroke('#efefef');
            doc.fontSize(14).fillColor('#224abe').text("VGURIE", 100, 70, { align: "center" });
            doc.fontSize(24).font('Helvetica-Bold').fillColor('#224abe').text(reportTitle, 50, 120, { align: "center" });
            doc.fontSize(16).font('Helvetica').fillColor('#000000').text(dateRange, 50, 155, { align: "center" });
            doc.moveDown(2);
            doc.rect(50, 180, doc.page.width - 100, 2).fill('#224abe');
            doc.moveDown(2);
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#224abe').text("Sales Summary", 50, 200, { underline: true });
            doc.moveDown(1);
            const summaryTable = {
                headers: ["Metric", "Value"],
                rows: [
                    ["Total Sales", `${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                    ["Total Orders", totalOrders.toString()],
                    ["Total Products Sold", totalProductsSold.toString()],
                    ["Total Users", totalUsers.toString()],
                    ["Total Discount", `${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                    ["Total Coupon Discount", `${totalCouponDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                   
                ]
            };
            const summaryTableTop = doc.y;
            const summaryColWidths = [200, 200];
            let currentY = summaryTableTop;
            doc.rect(50, currentY, summaryColWidths[0] + summaryColWidths[1], 30)
               .fill('#224abe');

            doc.fillColor("#ffffff").font('Helvetica-Bold').fontSize(14);
            summaryTable.headers.forEach((header, i) => {
                doc.text(
                    header,
                    50 + (i === 0 ? 20 : summaryColWidths[0] + 20),
                    currentY + 10,
                    { width: summaryColWidths[i] - 40, align: i === 0 ? "left" : "right" }
                );
            });
            currentY += 30;
            doc.font('Helvetica').fontSize(12);
            summaryTable.rows.forEach((row, rowIndex) => {
                if (rowIndex % 2 === 1) {
                    doc.rect(50, currentY, summaryColWidths[0] + summaryColWidths[1], 25)
                       .fill('#f3f6ff');
                } else {
                    doc.rect(50, currentY, summaryColWidths[0] + summaryColWidths[1], 25)
                       .fill('#ffffff');
                }

                doc.fillColor("#000000");
                doc.text(
                    row[0],
                    70,
                    currentY + 7,
                    { width: summaryColWidths[0] - 40, align: "left" }
                );
                const isImportant = row[0].includes("Total Sales") || row[0].includes("Collection");
                doc.font(isImportant ? 'Helvetica-Bold' : 'Helvetica');

                doc.text(
                    row[1],
                    50 + summaryColWidths[0],
                    currentY + 7,
                    { width: summaryColWidths[1] - 40, align: "right" }
                );

                doc.font('Helvetica');
                currentY += 25;
            });
            doc.rect(50, summaryTableTop, summaryColWidths[0] + summaryColWidths[1], currentY - summaryTableTop)
               .stroke('#cccccc');
            doc.moveDown(3);
            doc.rect(50, currentY + 20, doc.page.width - 100, 2).fill('#224abe');

            doc.addPage();

            doc.fontSize(18).font('Helvetica-Bold').fillColor('#224abe').text("Order Details", 50, 50, { underline: true });
            doc.moveDown(1);
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
                "Applied Coupon ObjectId"
            ];

            const colWidths = [80, 60, 40, 60, 60, 60, 60, 60, 50, 70];
            const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
            const maxRowsPerPage = 10;
            let rowCount = 0;

            const addTableHeaders = (y) => {
                doc.rect(50, y, tableWidth, 30).fill('#224abe');

                let xOffset = 50;
                doc.fillColor("#ffffff").font('Helvetica-Bold').fontSize(10);
                tableHeaders.forEach((header, i) => {
                    doc.text(
                        header,
                        xOffset + 5,
                        y + 10,
                        { width: colWidths[i] - 10, align: "center" }
                    );
                    xOffset += colWidths[i];
                });

                return y + 30;
            };
            let tableY = addTableHeaders(doc.y);
            rowCount++;
            doc.font('Helvetica').fontSize(9);

            for (let i = 0; i < pdfFormatData.length; i++) {
                const order = pdfFormatData[i];
                if (rowCount >= maxRowsPerPage) {
                    doc.addPage();
                    doc.fontSize(10).fillColor('#224abe').text("VGURIE Sales Report - Continued", 50, 50, { align: "center" });
                    doc.moveDown(1);
                    tableY = addTableHeaders(doc.y);
                    rowCount = 1;
                }
                if (i % 2 === 1) {
                    doc.rect(50, tableY, tableWidth, 25).fill('#f3f6ff');
                } else {
                    doc.rect(50, tableY, tableWidth, 25).fill('#ffffff');
                }
                doc.rect(50, tableY, tableWidth, 25).stroke('#cccccc');

                doc.fillColor("#000000");
                let xOffset = 50;
                doc.text(
                    order["Order ID"],
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[0] - 10, align: "left" }
                );
                xOffset += colWidths[0];
                doc.text(
                    order["Date"],
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[1] - 10, align: "center" }
                );
                xOffset += colWidths[1];
                doc.text(
                    order["Items"].toString(),
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[2] - 10, align: "center" }
                );
                xOffset += colWidths[2];
                doc.text(
                    order["Total"],
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[3] - 10, align: "right" }
                );
                xOffset += colWidths[3];
                doc.text(
                    order["Discount"],
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[4] - 10, align: "right" }
                );
                xOffset += colWidths[4];
                doc.text(
                    order["Coupon"],
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[5] - 10, align: "right" }
                );
                xOffset += colWidths[5];
                doc.text(
                    order["Final"],
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[6] - 10, align: "right" }
                );
                xOffset += colWidths[6];
                doc.text(
                    order["Payment"],
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[7] - 10, align: "center" }
                );
                xOffset += colWidths[7];
                const statusColor = order["Status"] === "Delivered" ? "#28a745" :
                                   order["Status"] === "Pending" ? "#ffc107" :
                                   order["Status"] === "Cancelled" ? "#dc3545" : "#000000";

                doc.fillColor(statusColor).font('Helvetica-Bold');
                doc.text(
                    order["Status"],
                    xOffset + 5,
                    tableY + 8,
                    { width: colWidths[8] - 10, align: "center" }
                );
                doc.fillColor("#000000").font('Helvetica');
                doc.text(
                    order["Applied Coupon ObjectId"],
                    xOffset + colWidths[8] + 5,
                    tableY + 8,
                    { width: colWidths[9] - 10, align: "center" }
                );

                tableY += 25;
                rowCount++;
            }
            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#224abe').text("Payment Method Analysis", 50, 50, { underline: true });
            doc.moveDown(1);
            const paymentMethods = {};
            orders.forEach(order => {
                const method = order.paymentMethod || 'Unknown';
                if (!paymentMethods[method]) {
                    paymentMethods[method] = {
                        count: 0,
                        total: 0
                    };
                }
                paymentMethods[method].count++;
                paymentMethods[method].total += order.totalAmount - (order.refundedAmount || 0) - (order.couponDiscount || 0);
            });
            const paymentTable = {
                headers: ["Payment Method", "Number of Orders", "Total Amount"],
                rows: Object.entries(paymentMethods).map(([method, data]) => [
                    method,
                    data.count.toString(),
                    `${data.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ])
            };
            const paymentColWidths = [150, 150, 150];
            const paymentTableWidth = paymentColWidths.reduce((sum, width) => sum + width, 0);
            doc.rect(50, doc.y, paymentTableWidth, 30).fill('#224abe');
            let pmXOffset = 50;
            doc.fillColor("#ffffff").font('Helvetica-Bold').fontSize(12);
            paymentTable.headers.forEach((header, i) => {
                doc.text(
                    header,
                    pmXOffset + 5,
                    doc.y + 10,
                    { width: paymentColWidths[i] - 10, align: "center" }
                );
                pmXOffset += paymentColWidths[i];
            });

            doc.moveDown(2);

            doc.font('Helvetica').fontSize(11);
            let pmCurrentY = doc.y;

            paymentTable.rows.forEach((row, rowIndex) => {

                if (rowIndex % 2 === 1) {
                    doc.rect(50, pmCurrentY, paymentTableWidth, 25).fill('#f3f6ff');
                } else {
                    doc.rect(50, pmCurrentY, paymentTableWidth, 25).fill('#ffffff');
                }
                doc.rect(50, pmCurrentY, paymentTableWidth, 25).stroke('#cccccc');

                let pmXOffset = 50;
                doc.fillColor("#000000");

                row.forEach((cell, i) => {
                    doc.text(
                        cell,
                        pmXOffset + 5,
                        pmCurrentY + 8,
                        { width: paymentColWidths[i] - 10, align: i === 0 ? "left" : "center" }
                    );
                    pmXOffset += paymentColWidths[i];
                });

                pmCurrentY += 25;
            });
            const totalPages = doc.bufferedPageCount;
            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);
                doc.rect(50, doc.page.height - 40, doc.page.width - 100, 2).fill('#224abe');

                doc.fontSize(8).fillColor('#666666').text(
                    `Report generated on: ${new Date().toLocaleString()}`,
                    50,
                    doc.page.height - 30,
                    { align: "left", width: doc.page.width - 100 }
                );

                doc.fontSize(8).fillColor('#666666').text(
                    `Page ${i + 1} of ${totalPages}`,
                    50,
                    doc.page.height - 30,
                    { align: "right", width: doc.page.width - 100 }
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


export const chart = async (req, res) => {
    try {
        const { filter, month, year, startDate, endDate } = req.query;

        // Default to current month/year if not provided
        const now = new Date();
        const currentMonth = month || (now.getMonth() + 1).toString(); // getMonth() is 0-based
        const currentYear = year || now.getFullYear().toString();

        let barLabels = [];
        let barSales = [];
        let matchConditions = { status: "Delivered" };

        // Bar Chart Data (Existing Logic)
        if (filter === "daily") {
            matchConditions.createdAt = {
                $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
            };
            const dailyData = await Order.aggregate([
                { $match: matchConditions },
                { $group: { _id: { $hour: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
                { $sort: { _id: 1 } },
            ]);
            barLabels = dailyData.map(item => `Hour ${item._id}`);
            barSales = dailyData.map(item => item.totalSales);
        } else if (filter === "monthly" || !filter) { 
            matchConditions.createdAt = {
                $gte: new Date(currentYear, currentMonth - 1, 1),
                $lte: new Date(currentYear, currentMonth - 1, 31),
            };
            const monthlyData = await Order.aggregate([
                { $match: matchConditions },
                { $group: { _id: { $dayOfMonth: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
                { $sort: { _id: 1 } },
            ]);
            barLabels = monthlyData.map(item => `Day ${item._id}`);
            barSales = monthlyData.map(item => item.totalSales);
        } else if (filter === "custom" && startDate && endDate) {
            matchConditions.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
            const customData = await Order.aggregate([
                { $match: matchConditions },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, totalSales: { $sum: "$totalAmount" } } },
                { $sort: { _id: 1 } },
            ]);
            barLabels = customData.map(item => item._id);
            barSales = customData.map(item => item.totalSales);
        } else if (filter === "yearly") {
            matchConditions.createdAt = {
                $gte: new Date(currentYear, 0, 1),
                $lte: new Date(currentYear, 11, 31),
            };
            const yearlyData = await Order.aggregate([
                { $match: matchConditions },
                { $group: { _id: { $month: "$createdAt" }, totalSales: { $sum: "$totalAmount" } } },
                { $sort: { _id: 1 } },
            ]);
            barLabels = yearlyData.map(item => {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return monthNames[item._id - 1];
            });
            barSales = yearlyData.map(item => item.totalSales);
        }

        // Pie Chart Data (Existing Logic)
        const paymentData = await Order.aggregate([
            { $match: matchConditions },
            { $group: { _id: "$paymentMethod", totalSales: { $sum: "$totalAmount" } } },
        ]);
        const pieLabels = paymentData.map(item => item._id || "Unknown");
        const pieSales = paymentData.map(item => item.totalSales);

        // Line Chart Data (New Logic for Current and Previous Week)
        const today = new Date();
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(today.getDate() - today.getDay() + 1); // Start of current week (Monday)
        const endOfCurrentWeek = new Date(startOfCurrentWeek);
        endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6); // End of current week (Sunday)

        const startOfPreviousWeek = new Date(startOfCurrentWeek);
        startOfPreviousWeek.setDate(startOfCurrentWeek.getDate() - 7); // Start of previous week
        const endOfPreviousWeek = new Date(startOfPreviousWeek);
        endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 6); // End of previous week

        // Current Week Data
        const currentWeekData = await Order.aggregate([
            {
                $match: {
                    status: "Delivered",
                    createdAt: {
                        $gte: startOfCurrentWeek,
                        $lte: endOfCurrentWeek,
                    },
                },
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" }, // 1 = Sunday, 2 = Monday, ..., 7 = Saturday
                    totalSales: { $sum: "$totalAmount" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Previous Week Data
        const previousWeekData = await Order.aggregate([
            {
                $match: {
                    status: "Delivered",
                    createdAt: {
                        $gte: startOfPreviousWeek,
                        $lte: endOfPreviousWeek,
                    },
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

        // Prepare Line Chart Data
        const lineLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const currentWeekSales = Array(7).fill(0); // Initialize with zeros for each day
        const previousWeekSales = Array(7).fill(0);

        currentWeekData.forEach(item => {
            // $dayOfWeek: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
            // Map to array index: Mon (2) -> 0, Tue (3) -> 1, ..., Sun (1) -> 6
            const dayIndex = item._id === 1 ? 6 : item._id - 2;
            currentWeekSales[dayIndex] = item.totalSales;
        });

        previousWeekData.forEach(item => {
            const dayIndex = item._id === 1 ? 6 : item._id - 2;
            previousWeekSales[dayIndex] = item.totalSales;
        });

        res.json({
            barChart: { labels: barLabels, sales: barSales },
            pieChart: { labels: pieLabels, sales: pieSales },
            lineChart: {
                labels: lineLabels,
                currentWeekSales: currentWeekSales,
                previousWeekSales: previousWeekSales,
            },
        });
    } catch (error) {
        console.error("Error generating chart data:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};