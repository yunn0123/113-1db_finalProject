// const { get, update } = require('lodash');
const db = require('../db.js');

const queries = {
    // 新增書籍
    newBook: 'INSERT INTO books (title, isbn, edition, p_year, Genre, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING book_id',
    newAV: 'INSERT INTO av_material (title, isan, status, p_year, duration) VALUES ($1, $2, $3, $4, $5) RETURNING av_id',
    // add author (新增書籍時自動加入)
    newBookAuthor: 'INSERT INTO book_authors (book_id, author) VALUES ($1, $2)',
    newAVAuthor: 'INSERT INTO av_authors (av_id, author) VALUES ($1, $2)',    
    // 新增採買
    newBookAcq: "INSERT INTO book_acq (library_id, a_date, status, isbn, cost, supplier) VALUES ('L001', $1, $2, $3, $4, $5)",
    newAVAcq: "INSERT INTO av_acq (library_id, a_date, status, isan, cost, supplier) VALUES ('L001', $1, $2, $3, $4, $5)",
    // 更新書籍
    updateBook: 'UPDATE books SET title = $1, isbn = $2, edition = $3, p_year = $4, genre = $5 WHERE book_id = $6 FOR UPDATE',
    updateAV: 'UPDATE av_material SET title = $1, isan = $2, p_year = $3, duration = $4 WHERE av_id = $5 FOR UPDATE',
    // 刪除書籍
    deleteBook: "UPDATE books SET status = '已刪除' WHERE book_id = $1 FOR UPDATE",
    deleteAV: "UPDATE av_material SET status = '已刪除' WHERE av_id = $1 FOR UPDATE",
    // 更新書籍狀態
    updateBookStatus: 'UPDATE books SET status = $1 WHERE book_id = $2 FOR UPDATE',
    updateAVStatus: 'UPDATE av_material SET status = $1 WHERE av_id = $2 FOR UPDATE',
    // 歸還書籍
    returnBook: "UPDATE book_loan SET r_date = CURRENT_DATE WHERE book_id = $1 and u_id = $2 RETURN esti_r_date, r_date FOR UPDATE",
    returnAV: "UPDATE av_loan SET r_date = CURRENT_DATE WHERE av_id = $1 and u_id = $2 RETURN esti_r_date, r_date FOR UPDATE",
    // 自動更新借閱狀態(for 逾期未歸還)
    updateOverdueBookLoan: "UPDATE book_loan SET status = '逾期未歸還' WHERE r_date IS NULL AND status = '未歸還' AND esti_r_date < CURRENT_DATE  FOR UPDATE",
    updateOverdueAVLoan: "UPDATE av_loan SET status = '逾期未歸還' WHERE r_date IS NULL AND status = '未歸還' AND esti_r_date < CURRENT_DATE  FOR UPDATE", 
    // 評分
    ratingBook: "UPDATE book_loan SET rating = $1 WHERE book_id = $2 and u_id = $3 FOR UPDATE",
    ratingAV: "UPDATE av_loan SET rating = $1 WHERE av_id = $2 and u_id = $3 FOR UPDATE",
    // 查詢歷史學生借閱紀錄
    getBookLoansByUser: "SELECT * FROM book_loan WHERE u_id = $1 ORDER BY l_date DESC",
    getAVLoansByUser: "SELECT * FROM av_loan WHERE u_id = $1",
    // 查詢某時間段借閱紀錄
    getBookByTime: "SELECT * FROM book_loan WHERE l_date BETWEEN $1 AND $2",
    getAVByTime: "SELECT * FROM av_loan WHERE l_date BETWEEN $1 AND $2", 
    // 查詢借閱狀態
    getBookByStatus: "SELECT * FROM book_loan WHERE status = $1",
    getAVByStatus: "SELECT * FROM av_loan WHERE status = $1", 
    // 討論室
    getFixingDiscussionRoom: "SELECT * FROM discussion_room WHERE status = '維修中'",
    getFixingSeats: "SELECT * FROM seats WHERE status = '維修中'",
    updateDiscussionRoomStatus: "UPDATE discussion_room SET status = $1 WHERE room_id = $2 FOR UPDATE",
    updateSeatsStatus: "UPDATE seats SET status = $1 WHERE seat_id = $2 FOR UPDATE",
    // updateStudyRoomStatus: "UPDATE study_room SET status = $1 WHERE room_id = $2 FOR UPDATE",
    // 書展
    newFair: "INSERT INTO fair (name, s_date, e_date, library_id) VALUES ($1, $2, $3, 'L001') RETURNING fair_id",
    newFairBook: "INSERT INTO fair_books (fair_id, book_id) VALUES ($1, $2)",
    updateFairStartDate: "UPDATE fair SET s_date = $1 WHERE fair_id = $2 FOR UPDATE",
    updateFairEndDate: "UPDATE fair SET e_date = $1 WHERE fair_id = $2 FOR UPDATE",
}
const newFair = async (name, s_date, e_date, books) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.newFair, [name, s_date, e_date]);
        const fair_id = res.rows[0].fair_id;
        console.log('新增書展成功');
        if (books.length > 0) {
            for (let i = 0; i < books.length; i++) {
                await db.query(queries.newFairBook, [fair_id, books[i]]);
            }
            console.log('新增書展書籍成功');
            await db.query('COMMIT');
        }else{
            console.log('新增書展書籍失敗:無書籍');
            await db.query('ROLLBACK');
        }
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('新增書展失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const newBook = async (title, isbn, edition, p_year, genre, status, author) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.newBook, [title, isbn, edition, p_year, genre, status]);
        const book_id = res.rows[0].book_id;
        console.log('新增書籍成功, book_id', book_id);

        if (author.length > 0) {
            for (let i = 0; i < author.length; i++) {
                await db.query(queries.newBookAuthor, [book_id, author[i]]);
            }
            console.log('新增書籍作者成功');
        }
        else{
            console.log('新增書籍作者失敗:無作者');
        }
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('新增書籍或作者失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const newAV = async (title, isan, status, p_year, duration) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.newAV, [title, isan, status, p_year, duration]);
        const av_id = res.rows[0].av_id;
        console.log('新增影音成功, av_id', av_id);
        if (author.length > 0) {
            for (let i = 0; i < author.length; i++) {
                await db.query(queries.newAVAuthor, [av_id, author[i]]);
            }
            console.log('新增影音作者成功');
        }
        else{
            console.log('新增影音作者失敗:無作者');
        }
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('新增影音或作者失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const newBookAcq = async (a_date, status, isbn, cost, supplier) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.newBookAcq, [a_date, status, isbn, cost, supplier]);
        console.log('新增書籍採買紀錄成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('新增書籍採買紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const newAVAcq = async (a_date, status, isan, cost, supplier) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.newAVAcq, [a_date, status, isan, cost, supplier]);
        console.log('新增影音採買紀錄成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('新增影音採買紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

// WHERE book_id
const updateBook = async (title, isbn, edition, p_year, genre ,book_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateBook, [title, isbn, edition, p_year, genre ,book_id]);
        console.log('修改書籍成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('修改書籍失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// WHERE av_id
const updateAV = async (title , isan , p_year , duration, av_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateAV, [title , isan , p_year , duration, av_id]);
        console.log('修改影音成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('修改影音失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// WHERE book_id
const updateBookStatus = async (status, book_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateBookStatus, [status, book_id]);
        console.log('更新書籍狀態成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('更新書籍狀態失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// WHERE av_id
const updateAVStatus = async (status, av_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateAVStatus, [status, av_id]);
        console.log('更新影音狀態成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('更新影音狀態失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// WHERE book_id
const deleteBook = async (book_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.deleteBook, [book_id]);
        console.log('刪除書籍成功，狀態改為已刪除');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('刪除書籍失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// WHERE av_id
const deleteAV = async (av_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.deleteAV, [av_id]);
        console.log('刪除影音成功，狀態改為已刪除');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('刪除影音失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

// WHERE book_id and u_id, status 自動更新逾期未歸還
const updateOverdueBookLoan = async (status, book_id, u_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateOverdueBookLoan, [status, book_id, u_id]);
        console.log('更新書籍逾期紀錄成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('更新書籍逾期紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// WHERE av_id and u_id, status 自動更新逾期未歸還
const updateOverdueAVLoan = async (status, av_id, u_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateOverdueAVLoan, [status, av_id, u_id]);
        console.log('更新影音逾期紀錄成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('更新影音逾期紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

// WHERE book_id and u_id 
const returnBook = async (book_id, u_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.returnBook, [book_id, u_id]);
        const esti_r_date = res.rows[0].esti_r_date;
        const r_date = res.rows[0].r_date;
        if (new Date(r_date) > new Date(esti_r_date)) {
            let status = '逾期歸還';
            const updateRes = await db.query("UPDATE book_loan SET status = $1 WHERE book_id = $2 AND u_id = $3  FOR UPDATE", [status, book_id, u_id]);
            console.log('歸還書籍成功，狀態為逾期歸還');
        }
        else{
            let status = '已歸還';
            const updateRes = await db.query("UPDATE book_loan SET status = $1 WHERE book_id = $2 AND u_id = $3  FOR UPDATE", [status, book_id, u_id]);
            console.log('歸還書籍成功，狀態為已歸還');
        }
        console.log('歸還書籍成功'); 
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('歸還書籍失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// WHERE av_id and u_id , status 請判斷是逾期歸還 或 已歸還
const returnAV = async (av_id, u_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.returnAV, [av_id, u_id]);
        const esti_r_date = res.rows[0].esti_r_date;
        const r_date = res.rows[0].r_date;
        if (new Date(r_date) > new Date(esti_r_date)) {
            let status = '逾期歸還';
            const updateRes = await db.query("UPDATE av_loan SET status = $1 WHERE av_id = $2 AND u_id = $3  FOR UPDATE", [status, av_id, u_id]);
            console.log('歸還影音成功，狀態為逾期歸還');
        }
        else{
            let status = '已歸還';
            const updateRes = await db.query("UPDATE av_loan SET status = $1 WHERE av_id = $2 AND u_id = $3  FOR UPDATE", [status, av_id, u_id]);
            console.log('歸還影音成功，狀態為已歸還');
        }
        console.log('歸還影音成功'); 
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('歸還影音失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};


const ratingBook = async (rating, book_id, u_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.ratingBook, [rating, book_id, u_id]);
        console.log('評分書籍成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('評分書籍失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const ratingAV = async (rating, av_id, u_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.ratingAV, [rating, av_id, u_id]);
        console.log('評分影音成功');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('評分影音失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

// 更新書展開始日期
const updateFairStartDate = async (s_date, fair_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateFairEndDate, [e_date, fair_id]);
        console.log('更新書展結束日期成功');
        await db.query('COMMIT');
        return res.rowCount;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('更新書展結束日期失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// 更新書展結束日期
const updateFairEndDate = async (e_date, fair_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateFairEndDate, [e_date, fair_id]);
        console.log('更新書展結束日期成功');
        await db.query('COMMIT');
        return res.rowCount;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('更新書展結束日期失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
//////////////////////////////////

// get
const getBookLoansByUser = async (u_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.getBookLoansByUser, [u_id]);
        console.log('查詢書籍借閱紀錄成功');
        await db.query('COMMIT');
        return res.rows;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('查詢書籍借閱紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const getAVLoansByUser = async (u_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.getAVLoansByUser, [u_id]);
        console.log('查詢影音借閱紀錄成功');
        await db.query('COMMIT');
        return res.rows;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('查詢影音借閱紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const getBookByTime = async (start, end) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.getBookByTime, [start, end]);
        console.log('查詢書籍借閱紀錄成功');
        await db.query('COMMIT');
        return res.rows;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('查詢書籍借閱紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const getAVByTime = async (start, end) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.getAVByTime, [start, end]);
        console.log('查詢影音借閱紀錄成功');
        await db.query('COMMIT');
        return res.rows;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('查詢影音借閱紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const getBookByStatus = async (status) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.getBookByStatus, [status]);
        console.log('查詢書籍借閱紀錄成功');
        await db.query('COMMIT');
        return res.rows;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('查詢書籍借閱紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};

const getAVByStatus = async (status) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.getAVByStatus, [status]);
        console.log('查詢影音借閱紀錄成功');
        await db.query('COMMIT');
        return res.rows;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('查詢影音借閱紀錄失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
};
// data in disscussion room now doesn't have fixing status
const getFixingDiscussionRoom = async (callback) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.getFixingDiscussionRoom);
        console.log('查詢討論室維修中成功');
        await db.query('COMMIT');
        return res.rows;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('查詢討論室維修中失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
}

const getFixingSeats = async (callback) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.getFixingSeats);
        console.log('查詢維修中座位成功');
        await db.query('COMMIT');
        return res.rows;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('查詢維修中座位失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
}
// [可登記, 維修中]
const updateDiscussionRoomStatus = async (status, room_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateDiscussionRoomStatus, [status, room_id]);
        console.log('更新討論室狀態成功');
        await db.query('COMMIT');
        return res.rowCount;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('更新討論室狀態失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
}

const updateSeatsStatus = async (status, seat_id) => {
    try{
        await db.query('BEGIN');
        const res = await db.query(queries.updateSeatsStatus, [status, seat_id]);
        console.log('更新座位狀態成功');
        await db.query('COMMIT');
        return res.rowCount;
    } catch (error) {
        await db.query('ROLLBACK'); // 發生錯誤時回滾
        console.error('更新座位狀態失敗:', error.message);
        throw error; // 將錯誤拋出以供上層處理
    }
}

// const updateStudyRoomStatus = async (status, room_id) => {
//     try{
//         await db.query('BEGIN');
//         const res = await db.query(queries.updateStudyRoomStatus, [status, room_id]);
//         console.log('更新自修室狀態成功');
//         await db.query('COMMIT');
//         return res.rowCount;
//     } catch (error) {
//         await db.query('ROLLBACK'); // 發生錯誤時回滾
//         console.error('更新自修室狀態失敗:', error.message);
//         throw error; // 將錯誤拋出以供上層處理
//     }
// }

module.exports = {
    newFair,
    newBook,
    newAV,
    newBookAcq,
    newAVAcq,
    updateBook,
    updateAV,
    updateBookStatus,
    updateAVStatus,
    deleteBook,
    deleteAV,
    returnBook,
    returnAV,
    updateOverdueBookLoan,
    updateOverdueAVLoan,
    ratingBook,
    ratingAV,
    updateFairStartDate,
    updateFairEndDate,
    getBookLoansByUser,
    getAVLoansByUser,
    getBookByTime,
    getAVByTime,
    getBookByStatus,
    getAVByStatus,
    getFixingDiscussionRoom,
    getFixingSeats,
    updateDiscussionRoomStatus,
    updateSeatsStatus,
    // updateStudyRoomStatus,
};