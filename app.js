const express = require("express");
const pool = require("./db");
const app = express();

app.use(express.json()); // 解析 JSON 請求

// 根路徑
app.get("/", (req, res) => {
  res.send("Welcome to the Library Management System API");
});

// 查詢所有書籍
app.get("/books", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  console.log(bookId, userId);

  try {
    const result = await pool.query(
      "UPDATE books SET status = $1 WHERE book_id = $2 AND status = $3 RETURNING *",
      ["已被外借", bookId, "在架"]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Book not available" });
    }

    // 在 book_loan 表中插入紀錄
    const loanResult = await pool.query(
      "INSERT INTO book_loan (u_id, book_id, l_date, status) VALUES ($1, $2, NOW(), $3) RETURNING *",
      [userId, bookId, "已被外借"]
    );
    res.json(loanResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 根據書籍ID查詢書籍詳細資料
app.get("/books/:bookId", async (req, res) => {
  const { bookId } = req.params;
  try {
    const result = await pool.query("SELECT * FROM books WHERE book_id = $1", [
      bookId,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 預約討論室
app.post("/discussion_rooms/reserve", async (req, res) => {
  const { drId, userId, startTime, endTime } = req.body;
  console.log(drId, userId, startTime, endTime);
  try {
    const result = await pool.query(
      "INSERT INTO discussion_room_application (dr_id, u_id, s_time, e_time, application_time) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
      [drId, userId, startTime, endTime]
    );
    res.json(result.rows[0]);
  } catch (err) {
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
app.post('/study-room/apply', async (req, res) => {
  const { userId, srId, startTime, endTime, seatId } = req.body;
  try {
      // 檢查是否有重疊的時間段
      const conflictCheck = await pool.query(
          'SELECT * FROM study_room_application WHERE sr_id = $1 AND s_time < $3 AND e_time > $2',
          [srId, startTime, endTime]
      );

      if (conflictCheck.rowCount > 0) {
          return res.status(409).json({
              error: 'The selected time slot conflicts with an existing reservation.'
          });
      }

      // 插入申請記錄
      const result = await pool.query(
          'INSERT INTO study_room_application (sr_id, u_id, s_time, e_time) VALUES ($1, $2, $3, $4) RETURNING *',
          [srId, userId, startTime, endTime]
      );

      // 更新座位狀態為 "使用中"
      await pool.query(
          'UPDATE seats SET status = $1 WHERE seat_id = $2 AND sr_id = $3',
          ['使用中', seatId, srId]
      );

      res.status(201).json(result.rows[0]);
  } catch (err) {
      res.status(500).json({ error: err.message });
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
app.post("/wishlist", async (req, res) => {
  const { userId, date, isbnIsan } = req.body; // 從請求主體接收資料
  try {
    const result = await pool.query(
      "INSERT INTO wish_list (u_id, date, isbn_isan, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, date, isbnIsan, null] // `status` 設為 NULL
    );
    res.json(result.rows[0]); // 返回新增的許願記錄
  } catch (err) {
    res.status(500).json({ error: err.message }); // 錯誤處理
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
  } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO "user" (u_id, u_name, gender, department, degree, enroll_year, grade, enrollment_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        uId,
        uName,
        gender,
        department,
        degree,
        enrollYear,
        grade,
        enrollmentStatus,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
