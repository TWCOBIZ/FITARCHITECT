const multer = () => ({
  single: jest.fn(() => (req, res, next) => next()),
  array: jest.fn(() => (req, res, next) => next()),
  fields: jest.fn(() => (req, res, next) => next()),
  none: jest.fn(() => (req, res, next) => next()),
  any: jest.fn(() => (req, res, next) => next())
});

multer.memoryStorage = jest.fn(() => ({}));
multer.diskStorage = jest.fn(() => ({}));

module.exports = multer;