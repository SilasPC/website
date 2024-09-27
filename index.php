<!DOCTYPE html>
<html>
	<body>
		<ul>
			<?php
					$files = scandir("./");
					foreach ($files as $file) {
						$type = is_dir($file) ? "dir" : "file";
						print("<li><a href=\"$file\"><$type>$file</$type></a></li>\n");
					}
				?>
			</ul>
	</body>
</html>