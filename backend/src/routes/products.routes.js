const express = require('express');
const controller = require('../controllers/products.controller');

const router = express.Router();

router.get('/stats', controller.getStats);
router.get('/', controller.listProducts);
router.get('/:id', controller.getProductById);
router.post('/', controller.createProduct);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.deleteProduct);

module.exports = router;