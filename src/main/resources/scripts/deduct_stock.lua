-- KEYS[1]: concert:stock:{concertId}
-- ARGV[1]: talep edilen koltuk sayisi (seatCount)

local current_stock = redis.call('GET', KEYS[1])

if not current_stock then
    return -1 -- Stok anahtarı bulunamadı
end

local stock_num = tonumber(current_stock)
local requested_num = tonumber(ARGV[1])

if stock_num >= requested_num then
    redis.call('DECRBY', KEYS[1], requested_num)
    return 1 -- Başarılı
else
    return 0 -- Yetersiz kapasite
end