-- Chuyen anh minh hoa SVG sang anh chup (CC0, luu trong frontend/public/images). Chi doi anh mac dinh cua seed.
UPDATE menus SET image = REPLACE(image, '.svg', '.jpg') WHERE image LIKE '/images/menus/%.svg';
UPDATE party_services SET image = REPLACE(image, '.svg', '.jpg') WHERE image LIKE '/images/services/%.svg';
