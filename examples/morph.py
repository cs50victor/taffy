from manim import BLUE, GREEN, Circle, Create, Scene, Square, Text, Transform, Write


class Morph(Scene):
    def construct(self):
        label = Text("Same object, different representation", font_size=30)
        label.shift([0, 2, 0])
        square = Square(color=BLUE)
        circle = Circle(color=GREEN)
        self.play(Write(label))
        self.play(Create(square))
        self.play(Transform(square, circle), run_time=2)
        self.wait(1)
