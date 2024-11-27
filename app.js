const express = require("express");
// const pool = require("./db");
const { 
  newBook, // 新增書籍
  newFair, // 新增書展
  newAV,
  newBookAcq, // 新增採買
  newAVAcq,
  updateBook, // 更新書籍
  updateAV,
  deleteBook, // 刪除書籍
  deleteAV,
  updateBookStatus, // 更新書籍狀態
  updateAVStatus,
  returnBook, // 歸還書籍
  returnAV,
  updateOverdueBookLoan, // 更新借閱狀態(for 逾期未歸還)
  updateOverdueAVLoan, 
  ratingBook, // 評分
  ratingAV,
  updateFairStartDate, // 更新書展日期
  updateFairEndDate,
  getBookLoansByUser, // 查詢歷史學生借閱紀錄
  getAVLoansByUser,
  getBookByTime, // 查詢某時間段借閱紀錄
  getAVByTime, 
  getBookByStatus, // 查詢借閱狀態
  getAVByStatus,
  getFixingDiscussionRoom, // 查詢維修中討論室
  getFixingSeats, // 查詢維修中座位
  updateDiscussionRoomStatus, // 更新討論室狀態
  updateSeatsStatus, // 更新座位狀態
  updateStudyRoomStatus, // 更新自習室狀態

} = require('./db/admin.js'); // 引入 admin.js 中的函數
const app = express();
const cors = require('cors'); // 引入 cors

app.use(cors());
app.use(express.json()); // 解析 JSON 請求

// 根路徑
app.get("/", (req, res) => {
  res.send("Welcome to the Library Management System API");
});

// 查詢書籍（按標題過濾）
app.get("/books/search", async (req, res) => {
  const { title } = req.query;
  console.log(title);

  try {
    const result = await pool.query(
      'SELECT * FROM books WHERE "Title" ILIKE $1',
      [`%${title}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 借閱書籍
app.post("/books/borrow", async (req, res) => {
  const { bookId, userId } = req.body;

  // 檢查是否提供必要參數
  if (!bookId || !userId) {
    return res.status(400).json({ error: "Missing bookId or userId" });
  }

  // 開始交易
  const client = await pool.connect();
  try {
    await pool.query("BEGIN"); // 開始交易

    // 確認書籍是否可借閱
    const bookResult = await pool.query(
      "UPDATE books SET status = $1 WHERE book_id = $2 AND status = $3 RETURNING *",
      ["已被外借", bookId, "在架"]
    );

    if (bookResult.rowCount === 0) {
      await pool.query("ROLLBACK"); // 回滾交易
      return res.status(404).json({ error: "Book not available for borrowing" });
    }

    // 在 book_loan 表中新增借閱記錄
    const loanResult = await pool.query(
      "INSERT INTO book_loan (u_id, book_id, l_date, status) VALUES ($1, $2, CURRENT_DATE, $3) RETURNING *",
      [userId, bookId, "未歸還"]
    );

    // 提交交易
    await pool.query("COMMIT");
    res.json({
      message: "Book borrowed successfully",
      book: bookResult.rows[0],
      loan: loanResult.rows[0],
    });
  } catch (err) {
    await pool.query("ROLLBACK"); // 發生錯誤時回滾交易
    console.error("Error during book borrowing transaction:", err);
    res.status(500).json({ error: "Failed to borrow book. Please try again later." });
  } 
});



// 查詢書籍資料（根據書籍 ID 或 ISBN）
app.get("/books", async (req, res) => {
  const { bookId, isbn } = req.query;

  try {
    let query = 'SELECT * FROM books WHERE 1=1';
    const values = [];

    if (bookId) {
      query += ' AND book_id = $1';
      values.push(bookId);
    }

    if (isbn) {
      query += values.length === 0 ? ' AND isbn = $1' : ' AND isbn = $2';
      values.push(isbn);
    }

    if (values.length === 0) {
      // 沒有提供查詢條件時，返回所有書籍
      query = 'SELECT * FROM books';
    }

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No books found.' });
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查詢影音
app.get('/av/search', async (req, res) => {
  const { title, avId, isan } = req.query;

  try {
    let query = 'SELECT * FROM av_material WHERE 1=1';
    const values = [];

    if (title) {
      query += ' AND "Title" ILIKE $1';
      values.push(`%${title}%`);
    }

    if (avId) {
      query += values.length === 0 ? ' AND av_id = $1' : ' AND av_id = $2';
      values.push(avId);
    }

    if (isan) {
      query += values.length === 0 ? ' AND isan = $1' : ' AND isan = $2';
      values.push(isan);
    }

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'No AV material found.' });
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 借閱影音
app.post("/av/borrow", async (req, res) => {
  const { avId, userId } = req.body;

  // 檢查必要參數
  if (!avId || !userId) {
    return res.status(400).json({ error: "Missing avId or userId" });
  }
  try {
    await pool.query("BEGIN"); // 開始交易

    // 檢查影音是否可借閱
    const avResult = await pool.query(
      "UPDATE av_material SET status = $1 WHERE av_id = $2 AND status = $3 RETURNING *",
      ["已被外借", avId, "在架"]
    );

    if (avResult.rowCount === 0) {
      await pool.query("ROLLBACK"); // 回滾交易
      return res.status(404).json({ error: "AV material not available for borrowing" });
    }

    // 新增借閱記錄到 av_loan 表
    const loanResult = await pool.query(
      "INSERT INTO av_loan (u_id, av_id, l_date, esti_r_date, status) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', $3) RETURNING *",
      [userId, avId, "未歸還"]
    );

    await pool.query("COMMIT"); // 提交交易
    res.json({
      message: "AV material borrowed successfully",
      av: avResult.rows[0],
      loan: loanResult.rows[0],
    });
  } catch (err) {
    await pool.query("ROLLBACK"); // 發生錯誤時回滾交易
    console.error("Error during AV borrowing transaction:", err);
    res.status(500).json({ error: "Failed to borrow AV material. Please try again later." });
  }
});



// 預約討論室
app.post("/discussion_rooms/reserve", async (req, res) => {
  const { drId, userId, startTime, endTime } = req.body;

  // 檢查必要參數
  if (!drId || !userId || !startTime || !endTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    await pool.query("BEGIN"); // 開始交易

    // 檢查是否有時間衝突
    const conflictCheck = await pool.query(
      `SELECT * 
       FROM discussion_room_application 
       WHERE dr_id = $1 
         AND (($2 < e_time AND $3 > s_time))`,
      [drId, startTime, endTime]
    );

    if (conflictCheck.rowCount > 0) {
      await pool.query("ROLLBACK"); // 回滾交易
      return res.status(409).json({ error: "Time slot conflict for the selected discussion room" });
    }

    // 插入新的預約記錄
    const reserveResult = await pool.query(
      `INSERT INTO discussion_room_application 
       (dr_id, u_id, s_time, e_time, application_time) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [drId, userId, startTime, endTime]
    );

    await pool.query("COMMIT"); // 提交交易
    res.json({
      message: "Discussion room reserved successfully",
      reservation: reserveResult.rows[0],
    });
  } catch (err) {
    await pool.query("ROLLBACK"); // 發生錯誤時回滾交易
    res.status(500).json({ error: err.message });
  } 
});


// 查詢所有討論室
app.get("/discussion_rooms", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM discussion_room");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查詢所有自習室
app.get("/study-rooms", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM study_room");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查詢特定自習室的座位情況
app.get("/study-rooms/:id/seats", async (req, res) => {
  const { id } = req.params; // 自習室 ID
  try {
    const result = await pool.query("SELECT * FROM seats WHERE sr_id = $1", [
      id,
    ]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 申請自習室並更新座位狀態
app.post("/discussion_rooms/reserve", async (req, res) => {
  const { drId, userId, startTime, endTime } = req.body;

  // 檢查必要參數
  if (!drId || !userId || !startTime || !endTime) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await pool.query("BEGIN"); // 開始交易

    // 檢查是否有時間衝突的預約
    const conflictCheck = await pool.query(
      `SELECT * 
       FROM discussion_room_application 
       WHERE dr_id = $1 
         AND (($2 < e_time AND $3 > s_time))`,
      [drId, startTime, endTime]
    );

    if (conflictCheck.rowCount > 0) {
      await pool.query("ROLLBACK"); // 回滾交易
      return res.status(409).json({ error: "Time slot conflict for the selected discussion room" });
    }

    // 插入新的預約記錄
    const reserveResult = await pool.query(
      `INSERT INTO discussion_room_application 
       (dr_id, u_id, s_time, e_time, application_time) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [drId, userId, startTime, endTime]
    );

    await pool.query("COMMIT"); // 提交交易
    res.json({
      message: "Discussion room reserved successfully",
      reservation: reserveResult.rows[0],
    });
  } catch (err) {
    await pool.query("ROLLBACK"); // 發生錯誤時回滾交易
    console.error("Error during discussion room reservation:", err);
    res.status(500).json({ error: "Failed to reserve discussion room. Please try again later." });
  }
});


// 查詢使用者的許願列表
app.get("/wishlist", async (req, res) => {
  const { userId } = req.query;
  try {
    const result = await pool.query("SELECT * FROM wish_list WHERE u_id = $1", [
      userId,
    ]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 提交許願
app.post("/wishlist/apply", async (req, res) => {
  const { userId, date, isbnIsan } = req.body; // 從請求主體接收資料

  // 檢查必要參數
  if (!userId || !date || !isbnIsan) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    await pool.query("BEGIN"); // 開始交易

    // 新增許願記錄
    const result = await pool.query(
      "INSERT INTO wish_list (u_id, date, isbn_isan, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, date, isbnIsan, null] // `status` 設為 NULL
    );

    await pool.query("COMMIT"); // 提交交易

    res.json({
      message: "Wishlist item added successfully",
      wish: result.rows[0],
    });
  } catch (err) {
    await pool.query("ROLLBACK"); // 發生錯誤時回滾交易
    res.status(500).json({ error: err.message });
  } 
});

// 查詢現有書展
app.get("/fairs/active", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT name, s_date, e_date 
       FROM book_fair 
       WHERE CURRENT_DATE BETWEEN s_date AND e_date`
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "No active fairs found." });
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching active fairs:", err);
    res.status(500).json({ error: "Failed to fetch active fairs." });
  }
});

app.get("/fairs/:name/books", async (req, res) => {
  const { name } = req.params; // 書展名稱

  try {
    await pool.query("BEGIN"); // 開始交易

    // 查詢該書展內的所有書籍 ID
    const fairBooksResult = await pool.query(
      `SELECT book_id 
       FROM book_fair_books 
       WHERE name = $1`,
      [name]
    );

    if (fairBooksResult.rowCount === 0) {
      await pool.query("ROLLBACK"); // 回滾交易
      return res.status(404).json({ message: "No books found for this fair." });
    }

    const bookIds = fairBooksResult.rows.map(row => row.book_id);

    // 查詢這些書籍的詳細資訊
    const booksResult = await pool.query(
      `SELECT * 
       FROM books 
       WHERE book_id = ANY($1)`,
      [bookIds]
    );

    await pool.query("COMMIT"); // 提交交易
    res.json(booksResult.rows);
  } catch (err) {
    await pool.query("ROLLBACK"); // 發生錯誤時回滾交易
    console.error("Error fetching books for fair:", err);
    res.status(500).json({ error: "Failed to fetch books for fair." });
  }
});


// 註冊使用者
app.post("/users", async (req, res) => {
  const {
    uId,
    uName,
    gender,
    department,
    degree,
    enrollYear,
    grade,
    enrollmentStatus,
    password,
  } = req.body;
  try {

    await pool.query("BEGIN"); // 開始交易
    const result = await pool.query(
      'INSERT INTO "user" (u_id, u_name, gender, department, degree, enroll_year, grade, enrollment_status, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        uId,
        uName,
        gender,
        department,
        degree,
        enrollYear,
        grade,
        enrollmentStatus,
        password,
      ]
    );
    await pool.query("COMMIT"); // 提交交易
    res.json(result.rows[0]);
  } catch (err) {
    await pool.query("ROLLBACK"); // 發生錯誤時回滾交易
    res.status(500).json({ error: err.message });
  }
});

// admin function
// 新增書展，順便傳入書單
app.post('/newFair', async (req, res) => {
  try{
      const { name, s_date, e_date, books } = req.body;
      const result = await newFair(name, s_date, e_date, books);
      res.status(200).json({ message: '新增書展成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '新增書展失敗', details: err.message });
  }
});

// 新增書籍，順便傳入作者
app.post('/newBook', async (req, res) => {
  try{
      const { title, isbn, edition, p_year, genre, status, author } = req.body;
      const result = await newBook(title, isbn, edition, p_year, genre, status, author);
      res.status(200).json({ message: '新增書籍成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '新增書籍失敗', details: err.message });   
  }
});

// 新增AV，順便傳入作者
app.post('/newAV', async (req, res) => {
  try{
      const { title, isan, status, p_year, duration, author } = req.body;
      const result = await newAV(title, isan, status, p_year, duration, author);
      res.status(200).json({ message: '新增影音成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '新增影音失敗', details: err.message });
  }
});

// 新增採買
app.post('/newBookAcq', async (req, res) => {
  try{
      const { a_date, status, isbn, cost, supplier } = req.body;
      const result = await newBookAcq(a_date, status, isbn, cost, supplier);
      res.status(200).json({ message: '採買新增成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(200).json({ message: '採買新增成功', updatedRows: rowCount });
  }
});

app.post('/newAVAcq', async (req, res) => {
  try{
      const { a_date, status, isan, cost, supplier } = req.body;
      const result = await newAVAcq(a_date, status, isan, cost, supplier);
      res.status(200).json({ message: '採買新增成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(200).json({ message: '採買新增成功', updatedRows: rowCount });
  }
});
// 更新資料
app.put('/updateBook', async (req, res) => {
  try{
      const { title, isbn, edition, p_year, genre, book_id} = req.body;
      const result = await updateBook(title, isbn, edition, p_year, genre, book_id);
      res.status(200).json({ message: '書籍更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '書籍更新失敗', details: err.message });
  }
});

app.put('/updateAV', async (req, res) => {
  try{
      const { title, isan, p_year, duration, av_id} = req.body;
      const result = await updateAV(title, isan, p_year, duration, av_id);
      res.status(200).json({ message: 'AV更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: 'AV更新失敗', details: err.message });
  }
});
// 此刪除功能是設定狀態為已刪除
app.put('/deleteBook', async (req, res) => {
  try{
      const { book_id } = req.body;
      const result = await deleteBook(book_id);
      res.status(200).json({ message: '書籍刪除成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '書籍刪除失敗', details: err.message });
  }
});

app.put('/deleteAV', async (req, res) => {
  try{
      const { av_id } = req.body;
      const result = await deleteAV(av_id);
      res.status(200).json({ message: 'AV刪除成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: 'AV刪除失敗', details: err.message });
  }
});

app.put('/updateBookStatus', async (req, res) => {
  try{
      const { status, book_id } = req.body;
      const result = await updateBookStatus(status, book_id);
      res.status(200).json({ message: '書籍狀態更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '書籍狀態更新失敗', details: err.message });
  }
});

app.put('/updateAVStatus', async (req, res) => {
  try{
      const { status, av_id } = req.body;
      const result = await updateAVStatus(status, av_id);
      res.status(200).json({ message: 'AV狀態更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: 'AV狀態更新失敗', details: err.message });
  }
});
// 傳入 book_id, u_id，假設紀錄日即為歸還日
app.put('/returnBook', async (req, res) => {
  try{
      const { book_id, u_id } = req.body;
      const result = await returnBook(book_id, u_id);
      res.status(200).json({ message: '歸還成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '歸還失敗', details: err.message });
  }
});

app.put('/returnAV', async (req, res) => {
  try{
      const { av_id, u_id } = req.body;
      const result = await returnAV(av_id, u_id);
      res.status(200).json({ message: '歸還成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '歸還失敗', details: err.message });
  }
});
// auto update overdue book loan for 逾期未歸還
app.put('/updateOverdueBookLoan', async (req, res) => {
  try{
      const result = await updateOverdueBookLoan();
      res.status(200).json({ message: '更新借閱狀態成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '更新借閱狀態失敗', details: err.message });
  }
});

app.put('/updateOverDueAVLoan', async (req, res) => {
  try{
      const result = await updateOverdueAVLoan();
      res.status(200).json({ message: '更新借閱狀態成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '更新借閱狀態失敗', details: err.message });
  }
});
// rating = [1, 2, 3, 4, 5] , 0為預設
app.put('/ratingBook', async (req, res) => {
  try{
      const { rating, book_id, u_id } = req.body;
      const result = await ratingBook(rating, book_id, u_id);
      res.status(200).json({ message: '評分成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '評分失敗', details: err.message });
  }
});

app.put('/ratingAV', async (req, res) => {
  try{
      const { rating, av_id, u_id } = req.body;
      const result = await ratingAV(rating, av_id, u_id);
      res.status(200).json({ message: '評分成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '評分失敗', details: err.message });
  }
});

app.put('/updateFairStartDate', async (req, res) => {
  try{
      const { fair_id, s_date } = req.body;
      const result = await updateFairStartDate(fair_id, s_date);
      res.status(200).json({ message: '書展日期更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '書展日期更新失敗', details: err.message });
  }
});

app.put('/updateFairEndDate', async (req, res) => {
  try{
      const { fair_id, e_date } = req.body;
      const result = await updateFairStartDate(fair_id, e_date);
      res.status(200).json({ message: '書展日期更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '書展日期更新失敗', details: err.message });
  }
});

// 學歷：B,R,D 入學年：08-13, 學號順序：01-80
app.get('/getBookLoansByUser', async (req, res) => {
  try{
      const { u_id } = req.query;
      const result = await getBookLoansByUser(u_id);
      res.status(200).json(result);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

app.get('/getAVLoansByUser', async (req, res) => {
  try{
      const { u_id } = req.query;
      const result = await getAVLoansByUser(u_id);
      res.status(200).json(result);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});
// 2018-09-01 ~
app.get('/getBookByTime', async (req, res) => {
  try{
      const { start_date, end_date } = req.query;
      const result = await getBookByTime(start_date, end_date);
      res.status(200).json(result);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

app.get('/getAVByTime', async (req, res) => {
  try{
      const { start_date, end_date } = req.query;
      const result = await getAVByTime(start_date, end_date);
      res.status(200).json(result);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});
// status = [未歸還, 已歸還, 逾期歸還, 逾期未歸還]
app.get('/getBookByStatus', async (req, res) => {
  try{
      const { status } = req.query;
      const result = await getBookByStatus(status);
      res.status(200).json(result);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

app.get('/getAVByStatus', async (req, res) => {
  try{
      const { status } = req.query;
      const result = await getAVByStatus(status);
      res.status(200).json(result);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// discussion room & study room & seats 狀態查詢與更新

// status = [維修中, 可登記, 使用中] （使用中應由使用者方更新，或之後合併功能）
app.get('/getFixingDiscussionRoom', async (req, res) => {
  try{
      const result = await getFixingDiscussionRoom();
      res.status(200).json(result);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

app.get('/getFixingSeats', async (req, res) => {
  try{
      const result = await getFixingSeats();
      res.status(200).json(result);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

app.put('/updateDiscussionRoomStatus', async (req, res) => {
  try{
      const { status, room_id } = req.body;
      const result = await updateDiscussionRoomStatus(status, room_id);
      res.status(200).json({ message: '討論室狀態更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '討論室狀態更新失敗', details: err.message });
  }
});

app.put('/updateSeatsStatus', async (req, res) => {
  try{
      const { status, seat_id } = req.body;
      const result = await updateSeatsStatus(status, seat_id);
      res.status(200).json({ message: '座位狀態更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '座位狀態更新失敗', details: err.message });
  }
});

app.put('/updateStudyRoomStatus', async (req, res) => {
  try{
      const { status, room_id } = req.body;
      const result = await updateStudyRoomStatus(status, room_id);
      res.status(200).json({ message: '自習室狀態更新成功', updatedRows: res.rowCount });
  } catch (err) {
      res.status(500).json({ error: '自習室狀態更新失敗', details: err.message });
  }
});


const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
