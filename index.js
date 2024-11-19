const { newBook, // 新增書籍
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
    
} = require('./db/admin.js'); // 引入 db_test
// 
const cors = require('cors'); // 引入 cors
const express = require('express'); // 引入 express
const app = express(); // for get, post, put, delete.. restful api
const port = 3000;

app.use(cors());
app.use(express.json());

// 新增書籍
app.post('/newBook', async (req, res) => {
    try{
        const { title, isbn, edition, p_year, genre, status } = req.body;
        const result = await newBook(title, isbn, edition, p_year, genre, status);
        res.status(200).json({ message: '新增書籍成功', updatedRows: res.rowCount });
    } catch (err) {
        res.status(500).json({ error: '新增書籍失敗', details: err.message });   
    }
});

// 新增AV
app.post('/newAV', async (req, res) => {
    try{
        const { title, isan, status, p_year, duration } = req.body;
        const result = await newAV(title, isan, status, p_year, duration);
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
        const { title, isbn, edition, p_year, genre, book_id, status } = req.body;
        const result = await updateBook(title, isbn, edition, p_year, genre, book_id, status);
        res.status(200).json({ message: '書籍更新成功', updatedRows: res.rowCount });
    } catch (err) {
        res.status(500).json({ error: '書籍更新失敗', details: err.message });
    }
});

app.put('/updateAV', async (req, res) => {
    try{
        const { title, isan, p_year, duration, av_id, status } = req.body;
        const result = await updateAV(title, isan, p_year, duration, av_id, status);
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});