export const sendResponse = (res, status, data) => {
   return res.status(status).json(data)
}