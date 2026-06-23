import os
import subprocess

class Canvas:
    def __init__(self, width=32, height=32):
        self.width = width
        self.height = height
        # Initialize with solid black background (#000000)
        self.pixels = [[(0, 0, 0) for _ in range(width)] for _ in range(height)]
    
    def set_pixel(self, x, y, color):
        if 0 <= x < self.width and 0 <= y < self.height:
            self.pixels[y][x] = color
            
    def draw_line(self, x0, y0, x1, y1, color):
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            self.set_pixel(x0, y0, color)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy
                
    def draw_rect(self, x0, y0, x1, y1, color, fill=False):
        if fill:
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for x in range(min(x0, x1), max(x0, x1) + 1):
                    self.set_pixel(x, y, color)
        else:
            self.draw_line(x0, y0, x1, y0, color)
            self.draw_line(x1, y0, x1, y1, color)
            self.draw_line(x1, y1, x0, y1, color)
            self.draw_line(x0, y1, x0, y0, color)

    def draw_circle(self, xc, yc, r, color, fill=False):
        x = r
        y = 0
        err = 0
        def draw_octants(x, y):
            if fill:
                for xi in range(xc - x, xc + x + 1):
                    self.set_pixel(xi, yc + y, color)
                    self.set_pixel(xi, yc - y, color)
                for xi in range(xc - y, xc + y + 1):
                    self.set_pixel(xi, yc + x, color)
                    self.set_pixel(xi, yc - x, color)
            else:
                self.set_pixel(xc + x, yc + y, color)
                self.set_pixel(xc - x, yc + y, color)
                self.set_pixel(xc + x, yc - y, color)
                self.set_pixel(xc - x, yc - y, color)
                self.set_pixel(xc + y, yc + x, color)
                self.set_pixel(xc - y, yc + x, color)
                self.set_pixel(xc + y, yc - x, color)
                self.set_pixel(xc - y, yc - x, color)
        draw_octants(x, y)
        while x >= y:
            y += 1
            err += 1 + 2*y
            if 2*(err - x) + 1 > 0:
                x -= 1
                err += 1 - 2*x
            draw_octants(x, y)

    def draw_polygon(self, points, color, fill=False):
        if not points:
            return
        if not fill:
            for i in range(len(points)):
                p1 = points[i]
                p2 = points[(i + 1) % len(points)]
                self.draw_line(p1[0], p1[1], p2[0], p2[1], color)
            return
        ys = [p[1] for p in points]
        min_y, max_y = min(ys), max(ys)
        for y in range(min_y, max_y + 1):
            nodes = []
            for i in range(len(points)):
                p1 = points[i]
                p2 = points[(i + 1) % len(points)]
                if p1[1] < y <= p2[1] or p2[1] < y <= p1[1]:
                    t = (y - p1[1]) / (p2[1] - p1[1])
                    intersect_x = int(p1[0] + t * (p2[0] - p1[0]))
                    nodes.append(intersect_x)
            nodes.sort()
            for j in range(0, len(nodes), 2):
                if j + 1 < len(nodes):
                    for x in range(nodes[j], nodes[j+1] + 1):
                        self.set_pixel(x, y, color)

    def save_ppm(self, path):
        with open(path, 'wb') as f:
            f.write(f"P6\n{self.width} {self.height}\n255\n".encode())
            for y in range(self.height):
                for x in range(self.width):
                    color = self.pixels[y][x]
                    f.write(bytes(color))

# --- Drawing Algorithms for All 34 Achievements ---

def generate_domstadt_don():
    c = Canvas()
    stone = (120, 120, 125)
    stone_dark = (70, 70, 75)
    roof = (0, 150, 100)
    gold = (255, 215, 0)
    c.draw_rect(6, 12, 10, 28, stone, fill=True)
    c.draw_rect(21, 12, 25, 28, stone, fill=True)
    c.draw_polygon([(6, 12), (8, 4), (10, 12)], roof, fill=True)
    c.draw_polygon([(21, 12), (23, 4), (25, 12)], roof, fill=True)
    c.draw_rect(10, 16, 21, 28, stone_dark, fill=True)
    c.draw_circle(15, 16, 4, roof, fill=True)
    c.draw_rect(13, 16, 18, 19, stone, fill=True)
    c.draw_circle(15, 26, 3, (0, 0, 0), fill=True)
    c.draw_rect(13, 26, 18, 28, (0, 0, 0), fill=True)
    c.draw_line(8, 2, 8, 4, gold)
    c.draw_line(7, 3, 9, 3, gold)
    c.draw_line(23, 2, 23, 4, gold)
    c.draw_line(22, 3, 24, 3, gold)
    c.set_pixel(15, 21, gold)
    return c

def generate_brezelfest_kral():
    c = Canvas()
    gold_dark = (140, 90, 15)
    gold_light = (240, 180, 30)
    gold_bright = (255, 220, 100)
    crown_gold = (210, 160, 10)
    gem_green = (0, 255, 80)
    c.draw_circle(11, 21, 6, gold_dark, fill=False)
    c.draw_circle(21, 21, 6, gold_dark, fill=False)
    c.draw_line(8, 21, 16, 27, gold_light)
    c.draw_line(24, 21, 16, 27, gold_light)
    c.draw_line(11, 17, 16, 22, gold_bright)
    c.draw_line(21, 17, 16, 22, gold_bright)
    c.draw_rect(10, 11, 22, 13, crown_gold, fill=True)
    c.draw_polygon([(10, 11), (11, 7), (13, 11)], crown_gold, fill=True)
    c.draw_polygon([(15, 11), (16, 5), (17, 11)], crown_gold, fill=True)
    c.draw_polygon([(19, 11), (21, 7), (22, 11)], crown_gold, fill=True)
    c.set_pixel(11, 7, gem_green)
    c.set_pixel(16, 5, gem_green)
    c.set_pixel(21, 7, gem_green)
    c.set_pixel(16, 12, gem_green)
    return c

def generate_maxi_flaneur():
    c = Canvas()
    grey_dark = (50, 50, 55)
    grey_light = (120, 120, 125)
    yellow_neon = (255, 255, 0)
    gold = (210, 170, 30)
    c.draw_line(5, 21, 27, 21, grey_light)
    c.draw_rect(8, 9, 24, 20, grey_dark, fill=True)
    c.draw_rect(8, 9, 24, 20, grey_light, fill=False)
    c.draw_rect(8, 18, 24, 20, yellow_neon, fill=True)
    c.draw_line(24, 11, 24, 7, gold)
    c.draw_line(24, 7, 21, 5, gold)
    c.draw_line(21, 5, 18, 7, gold)
    c.draw_line(18, 7, 18, 10, gold)
    c.draw_line(24, 11, 16, 29, gold)
    c.set_pixel(21, 5, yellow_neon)
    c.set_pixel(19, 22, yellow_neon)
    return c

def generate_schorle_und_cay():
    c = Canvas()
    glass_color = (190, 235, 255)
    green_neon = (50, 255, 50)
    orange_neon = (255, 120, 0)
    tea_color = (160, 45, 15)
    c.draw_line(7, 27, 11, 27, glass_color)
    c.draw_line(7, 27, 4, 13, glass_color)
    c.draw_line(11, 27, 13, 11, glass_color)
    c.draw_line(4, 13, 13, 11, glass_color)
    c.set_pixel(7, 16, green_neon)
    c.set_pixel(10, 15, green_neon)
    c.set_pixel(6, 21, green_neon)
    c.set_pixel(9, 20, green_neon)
    c.set_pixel(8, 24, green_neon)
    c.draw_line(19, 11, 28, 13, glass_color)
    c.draw_line(19, 11, 21, 18, glass_color)
    c.draw_line(21, 18, 23, 23, glass_color)
    c.draw_line(23, 23, 20, 27, glass_color)
    c.draw_line(28, 13, 26, 19, glass_color)
    c.draw_line(26, 19, 24, 23, glass_color)
    c.draw_line(24, 23, 25, 27, glass_color)
    c.draw_line(20, 27, 25, 27, glass_color)
    c.draw_rect(22, 22, 24, 26, tea_color, fill=True)
    c.set_pixel(23, 21, orange_neon)
    c.set_pixel(15, 11, green_neon)
    c.set_pixel(17, 12, orange_neon)
    c.set_pixel(14, 15, orange_neon)
    c.set_pixel(18, 15, green_neon)
    c.set_pixel(16, 18, green_neon)
    return c

def generate_technik_museum():
    c = Canvas()
    grey_metal = (130, 135, 140)
    cyan_neon = (0, 255, 255)
    cyan_dark = (0, 90, 140)
    c.draw_circle(16, 16, 9, grey_metal, fill=False)
    c.draw_rect(15, 4, 17, 6, grey_metal, fill=True)
    c.draw_rect(15, 26, 17, 28, grey_metal, fill=True)
    c.draw_rect(4, 15, 6, 17, grey_metal, fill=True)
    c.draw_rect(26, 15, 28, 17, grey_metal, fill=True)
    c.draw_line(7, 7, 9, 9, grey_metal)
    c.draw_line(23, 23, 25, 25, grey_metal)
    c.draw_line(23, 7, 25, 9, grey_metal)
    c.draw_line(7, 23, 9, 25, grey_metal)
    c.set_pixel(16, 4, cyan_neon)
    c.set_pixel(16, 28, cyan_neon)
    c.set_pixel(4, 16, cyan_neon)
    c.set_pixel(28, 16, cyan_neon)
    c.set_pixel(7, 7, cyan_neon)
    c.set_pixel(25, 25, cyan_neon)
    c.set_pixel(25, 7, cyan_neon)
    c.set_pixel(7, 23, cyan_neon)
    c.draw_circle(16, 16, 5, cyan_dark, fill=True)
    c.draw_circle(16, 16, 3, cyan_neon, fill=True)
    c.set_pixel(16, 16, (255, 255, 255))
    return c

def generate_altpoertel_sniper():
    c = Canvas()
    stone = (110, 110, 115)
    stone_dark = (60, 60, 65)
    red_roof = (190, 50, 45)
    red_neon = (255, 0, 0)
    c.draw_rect(11, 13, 21, 28, stone, fill=True)
    c.draw_rect(11, 13, 21, 28, stone_dark, fill=False)
    c.draw_rect(14, 23, 18, 28, (0, 0, 0), fill=True)
    c.draw_polygon([(11, 13), (16, 3), (21, 13)], red_roof, fill=True)
    c.set_pixel(14, 16, (0, 0, 0))
    c.set_pixel(18, 16, (0, 0, 0))
    c.draw_circle(16, 17, 8, red_neon, fill=False)
    c.draw_line(16, 5, 16, 11, red_neon)
    c.draw_line(16, 23, 16, 29, red_neon)
    c.draw_line(4, 17, 10, 17, red_neon)
    c.draw_line(22, 17, 28, 17, red_neon)
    c.set_pixel(16, 17, red_neon)
    return c

def generate_speyer_boss():
    c = Canvas()
    gold = (215, 175, 20)
    stone = (100, 100, 105)
    purple_neon = (210, 0, 255)
    purple_dark = (90, 10, 120)
    c.draw_rect(9, 6, 23, 23, stone, fill=True)
    c.draw_rect(9, 6, 23, 23, gold, fill=False)
    c.draw_rect(11, 8, 21, 21, purple_dark, fill=True)
    c.draw_polygon([(16, 10), (14, 13), (16, 16), (18, 13)], purple_neon, fill=True)
    c.draw_rect(6, 18, 8, 28, gold, fill=True)
    c.draw_rect(24, 18, 26, 28, gold, fill=True)
    c.set_pixel(7, 17, purple_neon)
    c.set_pixel(25, 17, purple_neon)
    c.draw_rect(9, 22, 23, 25, purple_dark, fill=True)
    c.draw_line(9, 24, 23, 24, purple_neon)
    c.draw_rect(8, 26, 24, 28, stone, fill=True)
    return c

def generate_vallah_krise():
    c = Canvas()
    yellow_face = (245, 195, 20)
    orange_shadow = (205, 125, 10)
    red_neon = (255, 0, 40)
    c.draw_circle(16, 16, 8, yellow_face, fill=True)
    c.draw_circle(16, 16, 8, orange_shadow, fill=False)
    c.draw_line(11, 13, 13, 14, (0, 0, 0))
    c.draw_line(11, 15, 13, 14, (0, 0, 0))
    c.draw_line(21, 13, 19, 14, (0, 0, 0))
    c.draw_line(21, 15, 19, 14, (0, 0, 0))
    c.draw_rect(13, 19, 19, 21, (0, 0, 0), fill=True)
    hand = (255, 225, 100)
    c.draw_rect(14, 12, 18, 17, hand, fill=True)
    c.draw_line(15, 9, 15, 12, hand)
    c.draw_line(16, 8, 16, 12, hand)
    c.draw_line(17, 9, 17, 12, hand)
    c.draw_line(4, 9, 4, 13, red_neon)
    c.set_pixel(4, 15, red_neon)
    c.draw_line(28, 9, 28, 13, red_neon)
    c.set_pixel(28, 15, red_neon)
    c.draw_line(6, 6, 8, 8, red_neon)
    c.draw_line(26, 6, 24, 8, red_neon)
    return c

def generate_kupon_yirtan():
    c = Canvas()
    paper = (225, 225, 225)
    ink = (90, 90, 95)
    red_neon = (255, 10, 10)
    c.draw_polygon([(4, 7), (14, 7), (12, 11), (15, 15), (11, 19), (13, 25), (4, 25)], paper, fill=True)
    c.draw_line(6, 10, 10, 10, ink)
    c.draw_line(6, 14, 9, 14, ink)
    c.draw_line(6, 18, 8, 18, ink)
    c.draw_polygon([(17, 9), (27, 9), (27, 26), (17, 26), (15, 21), (18, 17), (15, 13)], paper, fill=True)
    c.draw_line(20, 12, 25, 12, ink)
    c.draw_line(19, 16, 24, 16, ink)
    c.draw_line(21, 20, 25, 20, ink)
    c.draw_line(20, 23, 25, 23, (0, 0, 0))
    c.draw_line(20, 24, 25, 24, (0, 0, 0))
    c.draw_line(14, 7, 12, 11, red_neon)
    c.draw_line(12, 11, 15, 15, red_neon)
    c.draw_line(15, 15, 11, 19, red_neon)
    c.draw_line(11, 19, 13, 25, red_neon)
    c.draw_line(17, 9, 15, 13, red_neon)
    c.draw_line(15, 13, 18, 17, red_neon)
    c.draw_line(18, 17, 15, 21, red_neon)
    c.draw_line(15, 21, 17, 26, red_neon)
    c.draw_line(12, 11, 8, 12, red_neon)
    c.draw_line(18, 17, 22, 18, red_neon)
    return c

def generate_amk_modus():
    c = Canvas()
    red = (255, 60, 40)
    dark_red = (160, 20, 20)
    orange = (255, 120, 0)
    c.draw_circle(16, 16, 8, red, fill=True)
    c.draw_circle(16, 16, 8, dark_red, fill=False)
    c.draw_line(10, 12, 14, 14, (0, 0, 0))
    c.draw_line(22, 12, 18, 14, (0, 0, 0))
    c.set_pixel(11, 14, (0, 0, 0))
    c.set_pixel(20, 14, (0, 0, 0))
    c.draw_line(12, 21, 15, 19, (0, 0, 0))
    c.draw_line(15, 19, 17, 19, (0, 0, 0))
    c.draw_line(17, 19, 20, 21, (0, 0, 0))
    c.draw_circle(5, 12, 2, orange, fill=True)
    c.draw_circle(27, 12, 2, orange, fill=True)
    return c

def generate_ters_koese():
    c = Canvas()
    white = (240, 240, 245)
    orange = (255, 140, 0)
    c.draw_line(4, 8, 28, 8, white)
    c.draw_line(4, 8, 4, 28, white)
    c.draw_line(4, 14, 28, 14, (70, 70, 70))
    c.draw_line(4, 20, 28, 20, (70, 70, 70))
    c.draw_line(10, 8, 10, 28, (70, 70, 70))
    c.draw_line(18, 8, 18, 28, (70, 70, 70))
    c.draw_circle(23, 13, 3, white, fill=True)
    c.draw_line(16, 20, 20, 16, orange)
    c.draw_line(18, 22, 21, 18, orange)
    return c

def generate_hayalet():
    c = Canvas()
    white = (240, 245, 255)
    neon_blue = (0, 190, 255)
    c.draw_circle(16, 14, 7, white, fill=True)
    c.draw_rect(9, 14, 23, 24, white, fill=True)
    c.draw_rect(9, 24, 11, 26, white, fill=True)
    c.draw_rect(15, 24, 17, 26, white, fill=True)
    c.draw_rect(21, 24, 23, 26, white, fill=True)
    c.draw_circle(16, 14, 7, neon_blue, fill=False)
    c.draw_line(9, 14, 9, 26, neon_blue)
    c.draw_line(23, 14, 23, 26, neon_blue)
    c.draw_line(9, 26, 11, 26, neon_blue)
    c.draw_line(15, 26, 17, 26, neon_blue)
    c.draw_line(21, 26, 23, 26, neon_blue)
    c.draw_rect(12, 12, 13, 14, (0, 0, 0), fill=True)
    c.draw_rect(18, 12, 19, 14, (0, 0, 0), fill=True)
    return c

def generate_ugursuz():
    c = Canvas()
    black = (30, 30, 35)
    green = (0, 255, 100)
    purple = (180, 0, 255)
    c.draw_circle(16, 17, 7, black, fill=True)
    c.draw_polygon([(9, 12), (12, 10), (12, 14)], black, fill=True)
    c.draw_polygon([(23, 12), (20, 10), (20, 14)], black, fill=True)
    c.draw_line(12, 16, 14, 16, green)
    c.draw_line(18, 16, 20, 16, green)
    c.draw_line(6, 18, 11, 18, purple)
    c.draw_line(5, 20, 10, 19, purple)
    c.draw_line(21, 18, 26, 18, purple)
    c.draw_line(22, 19, 27, 20, purple)
    return c

def generate_kral_ciplak():
    c = Canvas()
    gold = (230, 180, 20)
    neon_yellow = (255, 255, 0)
    red_gem = (255, 0, 50)
    c.draw_line(7, 21, 23, 15, gold)
    c.draw_line(8, 23, 24, 17, gold)
    c.draw_line(7, 21, 8, 23, gold)
    c.draw_line(23, 15, 24, 17, gold)
    c.draw_polygon([(7, 21), (11, 11), (15, 18)], gold, fill=True)
    c.draw_polygon([(15, 18), (19, 9), (21, 16)], gold, fill=True)
    c.draw_polygon([(21, 16), (25, 7), (23, 15)], gold, fill=True)
    c.draw_line(16, 10, 15, 15, (0, 0, 0))
    c.draw_line(15, 15, 16, 21, (0, 0, 0))
    c.set_pixel(11, 11, red_gem)
    c.set_pixel(19, 9, red_gem)
    c.set_pixel(25, 7, red_gem)
    c.set_pixel(29, 10, neon_yellow)
    c.set_pixel(4, 25, neon_yellow)
    return c

def generate_finito():
    c = Canvas()
    iron = (100, 100, 105)
    red_glow = (255, 30, 30)
    yellow_core = (255, 255, 150)
    c.draw_line(16, 4, 16, 9, iron)
    c.draw_rect(11, 9, 21, 11, iron, fill=True)
    c.draw_rect(12, 12, 20, 22, red_glow, fill=True)
    c.draw_rect(14, 14, 18, 20, yellow_core, fill=True)
    c.draw_line(16, 12, 16, 22, iron)
    c.draw_line(13, 12, 13, 22, iron)
    c.draw_line(19, 12, 19, 22, iron)
    c.draw_rect(10, 23, 22, 25, iron, fill=True)
    return c

def generate_derby_baba():
    c = Canvas()
    red = (220, 30, 30)
    yellow = (240, 190, 10)
    navy = (20, 40, 150)
    silver = (180, 185, 190)
    c.draw_line(6, 26, 26, 6, red)
    c.draw_line(6, 22, 10, 26, yellow)
    c.draw_rect(6, 25, 7, 26, (140, 90, 10), fill=True)
    c.draw_line(26, 26, 6, 6, navy)
    c.draw_line(26, 22, 22, 26, yellow)
    c.draw_rect(25, 25, 26, 26, silver, fill=True)
    c.set_pixel(16, 16, (255, 255, 255))
    c.set_pixel(15, 16, yellow)
    c.set_pixel(17, 16, yellow)
    c.set_pixel(16, 15, red)
    c.set_pixel(16, 17, navy)
    return c

def generate_cim_bom_bom():
    c = Canvas()
    yellow = (240, 180, 10)
    red = (220, 30, 30)
    c.draw_circle(16, 16, 6, yellow, fill=True)
    c.draw_polygon([(16, 6), (13, 8), (16, 10)], red, fill=True)
    c.draw_polygon([(16, 6), (19, 8), (16, 10)], red, fill=True)
    c.draw_polygon([(10, 16), (12, 13), (12, 16)], red, fill=True)
    c.draw_polygon([(22, 16), (20, 13), (20, 16)], red, fill=True)
    c.draw_polygon([(10, 16), (12, 19), (12, 16)], red, fill=True)
    c.draw_polygon([(22, 16), (20, 19), (20, 16)], red, fill=True)
    c.draw_polygon([(16, 26), (13, 24), (16, 22)], red, fill=True)
    c.draw_polygon([(16, 26), (19, 24), (16, 22)], red, fill=True)
    c.set_pixel(14, 14, (0, 0, 0))
    c.set_pixel(18, 14, (0, 0, 0))
    c.set_pixel(16, 18, red)
    return c

def generate_fener_aglama():
    c = Canvas()
    yellow = (245, 215, 10)
    navy = (10, 30, 120)
    white = (255, 255, 255)
    c.draw_circle(16, 16, 7, yellow, fill=True)
    c.draw_circle(16, 16, 7, navy, fill=False)
    c.draw_polygon([(16, 17), (23, 19), (16, 21)], (255, 140, 0), fill=True)
    c.draw_circle(13, 13, 2, navy, fill=True)
    c.set_pixel(12, 12, white)
    c.draw_line(12, 16, 10, 22, (0, 190, 255))
    c.set_pixel(10, 22, (0, 190, 255))
    return c

def generate_kara_kartal():
    c = Canvas()
    black = (30, 30, 35)
    white = (235, 235, 240)
    red = (230, 20, 20)
    c.draw_circle(16, 15, 7, white, fill=True)
    c.draw_rect(10, 16, 22, 26, black, fill=True)
    c.draw_polygon([(18, 14), (25, 17), (18, 20)], (240, 180, 20), fill=True)
    c.set_pixel(16, 13, red)
    c.set_pixel(15, 13, red)
    return c

def generate_bize_her_yer_trabzon():
    c = Canvas()
    claret = (130, 0, 40)
    blue = (0, 150, 220)
    silver = (180, 185, 190)
    c.draw_polygon([(6, 16), (14, 12), (22, 16), (14, 20)], silver, fill=True)
    c.draw_polygon([(22, 16), (27, 13), (25, 16)], claret, fill=True)
    c.draw_polygon([(22, 16), (27, 19), (25, 16)], blue, fill=True)
    c.draw_line(10, 14, 18, 14, claret)
    c.draw_line(10, 18, 18, 18, blue)
    c.set_pixel(9, 15, (0, 0, 0))
    return c

def generate_der_alman():
    c = Canvas()
    gold = (245, 195, 20)
    white = (250, 250, 255)
    glass_color = (200, 235, 255)
    c.draw_rect(10, 14, 20, 27, glass_color, fill=True)
    c.draw_line(20, 17, 24, 17, glass_color)
    c.draw_line(24, 17, 24, 24, glass_color)
    c.draw_line(24, 24, 20, 24, glass_color)
    c.draw_rect(11, 17, 19, 26, gold, fill=True)
    c.draw_circle(11, 13, 3, white, fill=True)
    c.draw_circle(15, 12, 3, white, fill=True)
    c.draw_circle(19, 13, 3, white, fill=True)
    c.draw_circle(15, 14, 2, white, fill=True)
    return c

def generate_gurbetci():
    c = Canvas()
    brown = (120, 70, 25)
    dark_brown = (80, 45, 15)
    gold = (230, 180, 20)
    red = (220, 30, 30)
    c.draw_rect(7, 12, 25, 26, brown, fill=True)
    c.draw_rect(7, 12, 25, 26, dark_brown, fill=False)
    c.draw_rect(7, 12, 9, 14, gold, fill=True)
    c.draw_rect(23, 12, 25, 14, gold, fill=True)
    c.draw_rect(7, 24, 9, 26, gold, fill=True)
    c.draw_rect(23, 24, 25, 26, gold, fill=True)
    c.draw_line(13, 12, 13, 9, dark_brown)
    c.draw_line(19, 12, 19, 9, dark_brown)
    c.draw_line(13, 9, 19, 9, dark_brown)
    c.draw_rect(12, 16, 20, 22, red, fill=True)
    c.set_pixel(15, 19, (255, 255, 255))
    c.set_pixel(17, 19, (255, 255, 255))
    return c

def generate_hadi_lan():
    c = Canvas()
    wood = (140, 90, 30)
    glass = (200, 240, 255)
    orange = (255, 120, 0)
    c.draw_rect(8, 6, 24, 8, wood, fill=True)
    c.draw_rect(8, 24, 24, 26, wood, fill=True)
    c.draw_line(9, 8, 9, 24, wood)
    c.draw_line(23, 8, 23, 24, wood)
    c.draw_polygon([(11, 9), (21, 9), (16, 16)], glass, fill=False)
    c.draw_polygon([(11, 23), (21, 23), (16, 16)], glass, fill=False)
    c.draw_polygon([(13, 11), (19, 11), (16, 15)], orange, fill=True)
    c.draw_line(16, 15, 16, 21, orange)
    c.draw_polygon([(14, 23), (18, 23), (16, 21)], orange, fill=True)
    return c

def generate_hosgeldin_abi():
    c = Canvas()
    cyan = (0, 235, 255)
    hand_color = (255, 210, 150)
    # A
    c.draw_line(4, 6, 6, 6, cyan)
    c.draw_line(4, 6, 4, 10, cyan)
    c.draw_line(6, 6, 6, 10, cyan)
    c.draw_line(4, 8, 6, 8, cyan)
    # B
    c.draw_line(9, 6, 9, 10, cyan)
    c.draw_line(9, 6, 11, 6, cyan)
    c.draw_line(9, 8, 11, 8, cyan)
    c.draw_line(9, 10, 11, 10, cyan)
    c.set_pixel(11, 7, cyan)
    c.set_pixel(11, 9, cyan)
    # I
    c.draw_line(14, 6, 14, 10, cyan)
    # Hand
    c.draw_rect(20, 18, 26, 26, hand_color, fill=True)
    c.draw_line(20, 18, 18, 14, hand_color)
    c.draw_line(22, 18, 21, 13, hand_color)
    c.draw_line(24, 18, 24, 13, hand_color)
    c.draw_line(26, 18, 27, 14, hand_color)
    c.draw_line(26, 22, 29, 21, hand_color)
    return c

def generate_ilk_kan():
    c = Canvas()
    steel = (180, 185, 195)
    dark_steel = (110, 115, 120)
    red = (255, 0, 50)
    gold = (220, 170, 10)
    c.draw_line(24, 8, 10, 22, steel)
    c.draw_line(23, 7, 9, 21, dark_steel)
    c.draw_line(22, 10, 26, 6, gold)
    c.draw_rect(24, 6, 26, 8, (120, 80, 20), fill=True)
    c.draw_polygon([(9, 21), (7, 25), (11, 25)], red, fill=True)
    c.set_pixel(9, 26, red)
    return c

def generate_macher():
    c = Canvas()
    brown = (140, 95, 30)
    gold = (245, 195, 20)
    orange = (255, 110, 0)
    steel = (150, 155, 160)
    c.draw_line(9, 25, 19, 15, brown)
    c.draw_rect(16, 10, 25, 16, steel, fill=True)
    c.draw_rect(15, 11, 16, 15, gold, fill=True)
    c.draw_rect(25, 11, 26, 15, gold, fill=True)
    c.draw_line(11, 9, 14, 12, orange)
    c.draw_line(10, 14, 13, 15, orange)
    c.draw_line(14, 19, 12, 21, orange)
    return c

def generate_kahin():
    c = Canvas()
    purple = (180, 30, 255)
    light_purple = (220, 150, 255)
    gold = (210, 160, 20)
    c.draw_rect(10, 24, 22, 27, gold, fill=True)
    c.draw_line(12, 24, 16, 20, gold)
    c.draw_line(20, 24, 16, 20, gold)
    c.draw_circle(16, 13, 7, purple, fill=True)
    c.draw_circle(16, 13, 5, light_purple, fill=True)
    c.draw_circle(14, 11, 1, (255, 255, 255), fill=True)
    return c

def generate_son_dakika():
    c = Canvas()
    white = (240, 240, 245)
    yellow = (255, 255, 0)
    grey = (100, 100, 105)
    c.draw_circle(16, 16, 9, white, fill=True)
    c.draw_circle(16, 16, 9, grey, fill=False)
    c.draw_line(16, 16, 16, 10, (0, 0, 0))
    c.draw_line(16, 16, 21, 16, (0, 0, 0))
    c.draw_polygon([(22, 4), (16, 14), (19, 14), (11, 28), (17, 18), (14, 18)], yellow, fill=True)
    return c

def generate_bereket():
    c = Canvas()
    brown = (130, 80, 20)
    gold = (255, 215, 0)
    dark_brown = (80, 45, 10)
    c.draw_rect(6, 18, 26, 27, brown, fill=True)
    c.draw_rect(6, 18, 26, 27, dark_brown, fill=False)
    c.draw_rect(6, 8, 26, 13, brown, fill=True)
    c.draw_rect(6, 8, 26, 13, dark_brown, fill=False)
    c.draw_rect(8, 14, 24, 18, gold, fill=True)
    c.set_pixel(10, 12, gold)
    c.set_pixel(15, 11, gold)
    c.set_pixel(21, 12, gold)
    return c

def generate_psikopat():
    c = Canvas()
    red = (230, 30, 30)
    grey = (140, 140, 145)
    orange = (255, 120, 0)
    yellow = (255, 255, 0)
    c.draw_rect(10, 11, 13, 26, red, fill=True)
    c.draw_rect(14, 9, 18, 26, red, fill=True)
    c.draw_rect(19, 11, 22, 26, red, fill=True)
    c.draw_rect(9, 15, 23, 17, (30, 30, 30), fill=True)
    c.draw_rect(9, 21, 23, 23, (30, 30, 30), fill=True)
    c.draw_line(16, 9, 16, 5, grey)
    c.set_pixel(16, 4, yellow)
    c.set_pixel(15, 3, orange)
    c.set_pixel(17, 3, orange)
    c.set_pixel(16, 2, yellow)
    return c

def generate_kebap_spiess():
    c = Canvas()
    metal = (200, 200, 205)
    meat = (139, 69, 19)
    pepper = (50, 205, 50)
    tomato = (255, 69, 0)
    c.draw_line(4, 28, 9, 23, (139, 90, 40))
    c.draw_line(9, 23, 27, 5, metal)
    c.draw_rect(11, 19, 14, 21, meat, fill=True)
    c.draw_rect(14, 16, 17, 18, pepper, fill=True)
    c.draw_rect(17, 13, 20, 15, meat, fill=True)
    c.draw_rect(20, 10, 23, 12, tomato, fill=True)
    c.draw_rect(23, 7, 26, 9, meat, fill=True)
    c.set_pixel(12, 15, (255, 100, 0))
    c.set_pixel(19, 9, (255, 100, 0))
    c.set_pixel(22, 16, (255, 100, 0))
    return c

def generate_sifir_sikinti():
    c = Canvas()
    brown = (140, 95, 30)
    green = (34, 139, 34)
    neon_green = (50, 255, 50)
    rope = (220, 200, 160)
    c.draw_line(4, 28, 6, 12, brown)
    c.draw_polygon([(6, 12), (3, 8), (8, 10)], green, fill=True)
    c.draw_line(28, 28, 26, 12, brown)
    c.draw_polygon([(26, 12), (29, 8), (24, 10)], green, fill=True)
    c.draw_line(6, 18, 11, 22, rope)
    c.draw_line(11, 22, 21, 22, neon_green)
    c.draw_line(21, 22, 26, 18, rope)
    return c

def generate_gegen_den_strom():
    c = Canvas()
    salmon = (250, 128, 114)
    neon_blue = (0, 191, 255)
    c.draw_polygon([(16, 6), (12, 15), (16, 24), (20, 15)], salmon, fill=True)
    c.draw_polygon([(16, 24), (13, 28), (19, 28)], (200, 100, 90), fill=True)
    c.set_pixel(16, 8, (255, 255, 255))
    c.draw_line(6, 6, 6, 15, neon_blue)
    c.draw_line(6, 15, 8, 22, neon_blue)
    c.draw_line(26, 10, 26, 20, neon_blue)
    c.draw_line(26, 20, 24, 27, neon_blue)
    return c

def generate_kardesim_benim():
    c = Canvas()
    yellow = (245, 210, 10)
    pink = (255, 50, 150)
    c.draw_circle(11, 16, 5, yellow, fill=True)
    c.set_pixel(9, 14, (0, 0, 0))
    c.set_pixel(13, 14, (0, 0, 0))
    c.draw_line(9, 18, 13, 18, (0, 0, 0))
    c.draw_circle(21, 16, 5, yellow, fill=True)
    c.set_pixel(19, 14, (0, 0, 0))
    c.set_pixel(23, 14, (0, 0, 0))
    c.draw_line(19, 18, 23, 18, (0, 0, 0))
    c.draw_circle(11, 16, 5, pink, fill=False)
    c.draw_circle(21, 16, 5, pink, fill=False)
    return c

# --- Main Driver Script ---

def main():
    generators = {
        "domstadt_don": generate_domstadt_don,
        "brezelfest_kral": generate_brezelfest_kral,
        "maxi_flaneur": generate_maxi_flaneur,
        "schorle_und_cay": generate_schorle_und_cay,
        "technik_museum": generate_technik_museum,
        "altpoertel_sniper": generate_altpoertel_sniper,
        "speyer_boss": generate_speyer_boss,
        "vallah_krise": generate_vallah_krise,
        "kupon_yirtan": generate_kupon_yirtan,
        "amk_modus": generate_amk_modus,
        "ters_koese": generate_ters_koese,
        "hayalet": generate_hayalet,
        "ugursuz": generate_ugursuz,
        "kral_ciplak": generate_kral_ciplak,
        "finito": generate_finito,
        "derby_baba": generate_derby_baba,
        "cim_bom_bom": generate_cim_bom_bom,
        "fener_aglama": generate_fener_aglama,
        "kara_kartal": generate_kara_kartal,
        "bize_her_yer_trabzon": generate_bize_her_yer_trabzon,
        "der_alman": generate_der_alman,
        "gurbetci": generate_gurbetci,
        "hadi_lan": generate_hadi_lan,
        "hosgeldin_abi": generate_hosgeldin_abi,
        "ilk_kan": generate_ilk_kan,
        "macher": generate_macher,
        "kahin": generate_kahin,
        "son_dakika": generate_son_dakika,
        "bereket": generate_bereket,
        "psikopat": generate_psikopat,
        "kebap_spiess": generate_kebap_spiess,
        "sifir_sikinti": generate_sifir_sikinti,
        "gegen_den_strom": generate_gegen_den_strom,
        "kardesim_benim": generate_kardesim_benim
    }
    
    # We will save temporary PPM files in scripts/temp_ppm
    temp_dir = "/home/ne0nur/Projekte/fussball-tipprunde/scripts/temp_ppm"
    dest_dir = "/home/ne0nur/Projekte/fussball-tipprunde/public/achievements"
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(dest_dir, exist_ok=True)
    
    # Delete any old SVGs/PNGs in dest_dir to satisfy clean slate requirements
    for item in os.listdir(dest_dir):
        if item.endswith(".svg") or item.endswith(".jpg"):
            os.remove(os.path.join(dest_dir, item))
            print(f"Removed old asset: {item}")
            
    print(f"Generating {len(generators)} PPM files...")
    for name, gen_fn in generators.items():
        canvas = gen_fn()
        ppm_path = os.path.join(temp_dir, f"{name}.ppm")
        canvas.save_ppm(ppm_path)
        
        # Scale to 128x128 PNG using ImageMagick
        png_path = os.path.join(dest_dir, f"{name}.png")
        # Use nearest neighbor scaling (-scale 128x128) to keep it crisp
        subprocess.run(["magick", "convert", ppm_path, "-scale", "128x128", png_path])
        print(f"Successfully created: {name}.png")
        
        # Clean up temporary PPM
        os.remove(ppm_path)
        
    # Clean up temp directory
    os.rmdir(temp_dir)
    print("Done! All 34 achievements have been programmatically generated as 128x128 pixel art PNGs.")

if __name__ == "__main__":
    main()
